# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev        # start dev server
npm run build      # production build
npm run lint       # run ESLint

npm run db:migrate   # prisma migrate dev — create and apply migration
npm run db:generate  # regenerate client after schema changes
npm run db:seed      # seed the database (tsx prisma/seed.ts)
npm run db:studio    # open DB browser
npx prisma migrate deploy    # apply migrations in prod
```

## Architecture

Sistem absensi karyawan (MVP, ~30 karyawan): absen masuk/pulang dengan foto +
verifikasi wajah + GPS, absen luar kantor (Approval Absensi) yang butuh
approval admin, penugasan dinas luar (`FieldAssignment`) yang direncanakan
supervisor & disetujui admin, pengajuan izin/cuti, dan rekap untuk admin.
Tidak ada WFH — tidak diperbolehkan di sistem ini.
Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL,
Clerk (email+password), TanStack Query + Table, shadcn/ui.

### Route groups

- `app/(auth)/` — `/login` (redirect ke dashboard sesuai role kalau sudah login)
- `app/(employee)/` — `/dashboard`, `/riwayat`, `/izin` — butuh session role `EMPLOYEE`
- `app/(admin)/` — `/admin/dashboard`, `/admin/kehadiran`, `/admin/daftar-pekerja` (data master pekerja + buat akun), `/admin/rekapan-kehadiran` (rekap kehadiran, dulu bernama `/admin/rekapan-karyawan`), `/admin/izin`, `/admin/verifikasi`, `/admin/laporan`, `/admin/lokasi`, `/admin/waktu-kerja`, `/admin/hari-libur` — butuh session role `ADMIN`
- `app/(account)/` — `/profil` — cukup `requireUser()`, dipakai kedua role
- `app/action/` — Next.js Server Actions (semua file `"use server"`)
- `app/api/images/[filename]/` — serve foto absensi dari `uploads/images/` di disk
- `app/api/laporan/` — download rekap absensi CSV (cek role ADMIN sendiri, balas 403 bukan redirect)

`proxy.ts` (Next 16 menggantikan `middleware.ts`) hanya memastikan sudah login
(Clerk); redirect berdasarkan role dilakukan `requireRole()` di tiap layout.

### Server-side layers

```
app/action/          ← Server Actions: validate input → call Service → revalidatePath
servers/validators/  ← Zod schemas + DTO types (CreateXSchema, UpdateXSchema)
servers/services/    ← DB access via Prisma (XService.list / getById / create / update / delete)
lib/prisma.ts        ← singleton PrismaClient (uses PrismaPg adapter)
```

Actions import validators and services. Services import from `lib/prisma`. Nothing else should touch Prisma directly.

Helper domain (dipakai action, bukan service):

- `lib/geo.ts` — `haversineDistance()` (meter) + `formatDistance()`. Bebas Prisma, jadi
  `AttendanceDialog` ikut memakainya di client untuk tahu lebih awal kalau absennya di luar radius.
- `lib/date.ts` — semua konversi timezone: `getWorkDate()`, `getMinutesOfDay()`, `parseTimeToMinutes()`, `formatTime()`, `formatWorkDate()`, `workDateTimeToUtc()` (tanggal kerja + "HH:mm" → timestamp UTC, dipakai pencatatan absensi manual admin)
- `lib/storage.ts` — `saveImage()` menulis foto ke `uploads/images/`, mengembalikan URL `/api/images/[filename]`
- `lib/leave.ts` — label & varian badge untuk `LeaveType`/`LeaveStatus` + `countLeaveDays()`
- `lib/csv.ts` — `toCsv()` (pemisah `;` + BOM UTF-8 supaya rapi di Excel id-ID)
- `lib/work-schedule.ts` — hari kerja mingguan: `getWorkDayFor()`, `isNonWorkingDate()`,
  `isLateAt()`, `summarizeWeek()`, `orderWeek()`, `DAY_LABEL`. Bebas Prisma supaya bisa dipakai form client juga.
  `isLateAt()` adalah satu-satunya definisi "terlambat" — dipakai absen langsung maupun koreksi.
- `lib/holiday.ts` — hari libur tanggalan: `findHoliday()`, `indexHolidays()`, label & varian badge.
  Bebas Prisma, seperti `work-schedule.ts`.
- `lib/work-mode.ts` — label, varian badge, dan penjelasan untuk `WorkMode` + `AttendanceApproval`,
  `APPROVAL_MODES` (mode final yang boleh dipilih admin saat menyetujui — karyawan sendiri
  tidak memilih mode apa pun), dan `isLateEligible()`. Bebas Prisma seperti `work-schedule.ts`.
- `lib/storage.ts` — `saveImage()` (foto absensi, gambar saja) dan `saveAttachment()`
  (lampiran izin, gambar + PDF). `MAX_SIZE` di sini harus selaras dengan
  `experimental.serverActions.bodySizeLimit` di `next.config.ts`.

`lib/daily-recap.ts` — `buildDailyRecap()` + `countRecapStatus()`: rekap satu hari
(satu baris per karyawan aktif), dipakai bersama `/admin/dashboard` dan `/admin/kehadiran`.

`servers/services/report.service.ts` menyusun rekap per karyawan per hari
(`buildRecap()`), dipakai bersama oleh halaman `/admin/laporan`, endpoint CSV, dan
halaman karyawan supaya angka di layar dan di file selalu sama. `buildRecap()`
sendiri yang menentukan status `LIBUR` (pola mingguan `WorkDay` + tabel `Holiday`)
dan `missingCheckOut` — konsumennya tinggal memakai hasilnya.

**Klasifikasi kehadiran.** `RecapStatus` di `lib/attendance.ts` punya tujuh nilai:
`HADIR_DIKANTOR` | `LUAR_RADIUS` | `DINAS_LUAR` | `SAKIT` | `IZIN` | `ALFA` | `CUTI`.
`DayStatus` = tujuh itu + `LIBUR` (hari yang tidak menuntut kehadiran, bukan
klasifikasi kehadiran — tanpa dia setiap akhir pekan terbaca `ALFA`).
`CalendarStatus` = `DayStatus` + `KOSONG`.

`LUAR_RADIUS` dan `DINAS_LUAR` sengaja dipisah meski sama-sama "hadir di luar
kantor" — lihat bagian **Absen di luar radius + approval** di bawah untuk beda
keduanya. Keduanya tidak pernah muncul bersamaan untuk hari yang sama:
`LUAR_RADIUS` datang dari `statusFromCheckIn` (ada absen), `DINAS_LUAR` datang
dari cabang `FieldAssignment` di `ReportService.buildRecap` (tidak ada absen).

`HADIR_DIKANTOR` mencakup yang tepat waktu **maupun** yang terlambat.
Keterlambatan tetap dicatat dan ditampilkan, tapi sebagai atribut
(`Attendance.isLate`) — bukan status tersendiri. Jadi satu hari bisa berstatus
"Hadir di Kantor" sekaligus punya badge "Terlambat", dan `summary.terlambat`
adalah bagian dari `summary.hadirDikantor`, bukan tambahan.

Urutan penentuannya absen → izin → libur: karyawan yang tetap masuk di hari libur
dihitung hadir. `LeaveType` (`IZIN`/`SAKIT`/`CUTI`) sengaja sama persis dengan tiga
status izin, jadi jenis pengajuan terbawa apa adanya jadi status hari.

`buildRecap()` hanya menyertakan karyawan **aktif**, dan hanya untuk tanggal sejak
`createdAt` masing-masing — tanpa ini, karyawan yang berhenti muncul sebagai tidak
absen selamanya dan karyawan baru terlihat bolos sebelum tanggal masuknya.
Konsekuensinya: menonaktifkan karyawan juga menghapus dia dari laporan bulan-bulan
sebelumnya.

**Absen di luar radius + approval (Approval Absensi).** Absen di dalam radius
selalu `HADIR_DIKANTOR`, langsung sah. Absen di **luar** radius (karyawan
langsung ke lokasi kerja tanpa lewat kantor) otomatis dicatat `LUAR_RADIUS` dan
mewajibkan karyawan menulis **penjelasannya** (`workModeDetail`, minimal 5
karakter — tidak ada pilihan mode, tidak ada WFH), lalu disimpan dengan
`approvalStatus = PENDING`. Klaim itu **tidak pernah** dihitung terlambat.

`LUAR_RADIUS` ini beda kasus dari `FieldAssignment` ("Dinas Luar" di menu supervisor/admin):
`FieldAssignment` adalah penugasan dinas luar yang **direncanakan duluan**
(tanggal, tujuan, biaya, dst.) oleh supervisor dan disetujui admin — begitu
disetujui, karyawan yang ditugaskan tidak perlu absen sama sekali sepanjang
rentang tanggalnya. Approval Absensi di `/admin/verifikasi` adalah untuk kasus
dadakan/tidak direncanakan: karyawan tetap absen (foto + GPS) dari luar radius
dan admin menilai per kejadian.

Sakit/izin/cuti tidak bisa diklaim dari form absensi — jalurnya tetap pengajuan
`LeaveRequest` di `/izin`. Admin masih bisa menimpanya jadi salah satu itu saat
menyetujui.

Admin memutuskan di `/admin/verifikasi`: **setujui** (dengan mode apa pun dari
`APPROVAL_MODES`, termasuk menimpa klaim karyawan lewat `approvedMode`) atau
**tolak** (absensi dianulir, hari itu `ALFA`). Menyetujui sebagai `HADIR_DIKANTOR`
berarti GPS-nya dianggap meleset, jadi `isLate` dihitung ulang dari jam absen
aslinya.

Tiga helper di `lib/attendance.ts` adalah satu-satunya tempat keputusan itu
diterjemahkan jadi status rekap — `effectiveWorkMode()` (= `approvedMode ?? workMode`),
`isVoidedAttendance()`, dan `statusFromCheckIn()` — dipakai `buildRecap()` maupun
`buildDailyRecap()`. Baris yang ditolak tetap tersimpan sebagai jejak, tapi
diperlakukan seolah tidak pernah ada.

`PENDING` sengaja jadi **penanda** (`pendingApproval` di `RecapRow`/`ReportRow`),
bukan status tersendiri: harinya tetap terbaca sebagai mode yang diklaim karyawan,
dengan catatan bahwa admin belum memutuskan.

**Penambahan & koreksi absensi oleh admin.** Fitur pengajuan koreksi absensi sudah
dihapus; penggantinya dua aksi khusus `ADMIN`, tanpa antrean review (admin yang
melakukan bertanggung jawab, alasan selalu wajib):

- `createManualAttendance()` + `ManualAttendanceDialog` — **menambah** absen
  masuk/pulang untuk pengguna yang lupa absen. Berlaku untuk semua pengguna aktif
  (bukan hanya `EMPLOYEE`). Barisnya ditandai `isManual` + `createdByAdminId`
  (label **"Ditambahkan admin"**) dengan `photoUrl`/koordinat null dan alasan di
  `reviewNote`. Menolak menimpa baris yang berasal dari HP karyawan.
- `updateAttendanceTime()` + `EditAttendanceTimeDialog` — **mengoreksi jam** absensi
  yang sudah ada (dari HP maupun manual). Foto/GPS/approval tidak disentuh; jam
  sebelum koreksi **pertama** disimpan di `originalTimestamp` (tidak tertimpa koreksi
  berikutnya), pelaku di `editedById`/`editedAt`, alasan di `editNote` (label
  **"Diubah admin"**). `isLate`/`lateMinutes` dihitung ulang lewat `resolveLateness()`
  dengan `effectiveWorkMode()`. Jam pulang harus sesudah jam masuk (dan sebaliknya),
  dan tidak boleh di masa depan.
- `updateOvertimeTime()` + `EditOvertimeTimeDialog` (di `/admin/lembur`) — mengoreksi
  jam mulai/selesai lembur; status approval tidak berubah, durasi dihitung ulang,
  jam asli di `originalStartAt`/`originalEndAt`. Aturan "mulai >= 18:00" sengaja
  tidak berlaku untuk koreksi admin. Jam selesai < jam mulai = melewati tengah malam.

`isManual` **bukan** penanda "dari admin": `selfConfirmCheckout()` (karyawan
mengonfirmasi absen pulangnya sendiri) juga menyalakannya. Pakai `createdByAdminId`
(`RecapEntry.addedByAdmin`) untuk label "Ditambahkan admin".

Mobile memakai aksi yang sama lewat `POST /api/admin/attendance`,
`PATCH /api/admin/attendance/[id]`, dan `PATCH /api/admin/overtime/[id]` (semua
`requireApiRole(ADMIN)`); `GET /api/admin/attendance-recap?mode=daily` menyertakan
id absensi + lembur per karyawan untuk sheet koreksi di `mobile/src/app/rekapan-absen.tsx`.
Karyawan tidak punya jalur pengajuan apa pun untuk ini —
konsekuensinya sidebar karyawan tidak punya badge notifikasi lagi
(`NotificationService.forUser()` mengembalikan `{}` untuk `EMPLOYEE`).

**Akurasi GPS.** `Attendance.accuracyMeters` selalu disimpan. Absensi ditolak kalau
akurasinya lebih buruk dari `WorkSchedule.maxAccuracyMeters` (default 100 m, diatur
admin di menu Waktu Kerja) — dicek di client supaya karyawan bisa membaca ulang
lokasi, lalu dicek lagi di server sebagai penentu.

**Absen pulang cukup wajah.** Absen pulang (`CHECK_OUT`) hanya memverifikasi wajah —
tanpa GPS, radius, alasan luar radius, maupun approval, karena karyawan sering sudah
berada di tempat lain saat pulang. `submitAttendance` bercabang ke `recordCheckOut()`
begitu `type` = `CHECK_OUT`; baris yang tersimpan punya `latitude`/`longitude`/
`isWithinRadius` null dan `approvalStatus` null (sah langsung). Ketiga UI absen
(`AttendanceDialog`, `attendance-capture-screen`, dan `mobile/src/app/attendance-capture.tsx`)
sengaja tidak membaca GPS untuk `CHECK_OUT`, dan tidak butuh titik kantor sudah diatur.

**Absensi menggantung** (absen masuk ada, absen pulang tidak pernah tercatat)
tidak ditutup oleh cron. Hari itu terbaca lewat `isMissingCheckOut()` dan
`AttendanceService.listUnresolvedCheckouts()`. Saat karyawan hendak absen masuk lagi,
`submitAttendance` menolak sampai hari yang menggantung dikonfirmasi lewat
`confirmMissedCheckout()`: karyawan menekan **"Otomatis pukul 17:00"** (jam pulang hari
itu diisi 17:00 tanpa memilih jam — `time` dikosongkan, server memakai
`DEFAULT_MISSED_CHECKOUT_TIME`) atau memilih jam sendiri. UI-nya `MissedCheckoutDialog`
di web (dipasang di `SelfAttendanceDashboard`) dan `MissedCheckoutModal` di mobile.
Baris hasilnya `isManual` tanpa foto/GPS. Admin tetap bisa mencatat manual di
`/admin/kehadiran`.

Format tanggal/jam selalu dilakukan di server lalu dikirim ke client sebagai string,
supaya timezone tidak bergeser mengikuti perangkat karyawan.

### Prisma

The client is generated to `generated/prisma/` (not the default location). Always import types and the client from `@/generated/prisma`, not from `@prisma/client`:

```ts
import { Prisma, Role } from "@/generated/prisma";
import prisma from "@/lib/prisma"; // or: import { prisma } from "@/lib/prisma"
```

Run `npm run db:generate` after any schema change. Migrations live in `prisma/migrations/`. Prisma config (`prisma.config.ts`) sets `schema`, `migrations.path`, and `migrations.seed`, dan membaca env dari `.env` (bukan `.env.local` — Prisma CLI hanya load `.env`).

### Domain models

- **User** — profil/role aplikasi (`email`, `role` `EMPLOYEE`/`ADMIN`, `isActive`); identitas & password sepenuhnya di Clerk, dihubungkan lewat `clerkId` (unik)
- **OfficeLocation** — titik kantor (lat/long) + `radiusMeters`; dipakai untuk validasi jarak (haversine)
- **WorkSchedule** — kebijakan global: `lateToleranceMinutes` (satu baris aktif)
- **WorkDay** — selalu 7 baris, `dayOfWeek` unik (0 = Minggu … 6 = Sabtu, sama dengan `Date#getUTCDay()`) + `isWorkingDay` + jam masuk/pulang (`"HH:mm"`). Menentukan `isLate` dan hari libur — tidak ada lagi asumsi Sabtu/Minggu di kode
- **Attendance** — satu baris per `CHECK_IN`/`CHECK_OUT`; unik per (`userId`, `workDate`, `type`) supaya tidak dobel; simpan foto, koordinat, `distanceMeters`, `isWithinRadius`, `isLate`, `workMode`, `workModeDetail`, `approvalStatus`, `approvedMode`. `photoUrl` / `latitude` / `longitude` / `isWithinRadius` **nullable** — absensi yang dicatat manual (`isManual`) memang tidak punya foto & GPS, jadi jangan perlakukan null sebagai "di luar radius". Jejak admin: `createdByAdminId` (ditambahkan admin), `editedById`/`editedAt`/`originalTimestamp`/`editNote` (jam dikoreksi admin). `Overtime` punya jejak koreksi yang sama (`editedById`, `originalStartAt`, `originalEndAt`, `editNote`)
- **LeaveRequest** — pengajuan izin/sakit/cuti; status `PENDING` → `APPROVED`/`REJECTED` beserta `reviewedBy` / `reviewedAt` / `reviewNote`. Satu-satunya jalur untuk `SAKIT`/`IZIN`/`CUTI`
- **Holiday** — tanggal merah, cuti bersama, dan libur internal (`date` unik). Melengkapi `WorkDay` yang hanya mengatur pola mingguan

`servers/services/notification.service.ts` menghitung angka merah di sidebar
(`NotificationService.forUser()`), dipanggil sekali di `DashboardShell` supaya
ketiga layout tidak menghitungnya sendiri-sendiri. Isinya sengaja hanya hal yang
perlu ditindak orang yang sedang login — setelah koreksi absensi dihapus itu
berarti hanya antrean admin (pengajuan izin + approval absensi luar kantor);
karyawan tidak punya antrean apa pun, jadi badge-nya kosong.

`workDate`, `startDate`, dan `endDate` disimpan sebagai kolom `date` (tanpa jam) dan dihitung
memakai timezone `APP_TIMEZONE` (default `Asia/Jakarta`).

### Auth

Clerk (email + password only — sign-up dimatikan di Clerk Dashboard, akun karyawan
cuma bisa dibuat admin lewat `/admin/daftar-pekerja/baru`). Prisma `User` tidak
menyimpan password sama sekali; identitas & kredensial sepenuhnya di Clerk,
dihubungkan lewat `User.clerkId`.

```
proxy.ts         ← clerkMiddleware: cuma jamin sudah login, redirect ke /login kalau belum
lib/session.ts   ← DAL: getCurrentUser / requireUser / requireRole — auth() dari Clerk untuk
                   identitas, lalu role & isActive tetap dicek ulang ke Prisma tiap request
lib/role.ts      ← defaultRouteForRole()
app/(auth)/account-disabled/page.tsx ← sesi Clerk valid tapi user tidak ada/nonaktif di DB:
                   cabut sesi Clerk (client) lalu lempar ke /login, supaya tidak loop redirect
components/auth/LoginForm.tsx        ← useSignIn() dari @clerk/nextjs/legacy (custom UI, bukan <SignIn/> bawaan)
app/action/user.action.ts            ← createEmployee/updateEmployee/setEmployeeActive
                                        juga memanggil Clerk Backend API (clerkClient().users)
                                        supaya akun Clerk & baris Prisma selalu sinkron
```

Layout `(employee)` dan `(admin)` memanggil `requireRole()`, jadi user yang dinonaktifkan
(di-ban di Clerk **dan** `isActive=false` di Prisma) langsung kehilangan akses walau
sesi Clerk-nya masih valid. Ganti password dilakukan client-side lewat
`user.updatePassword()` (Clerk memverifikasi password lama sendiri) — tidak ada
server action untuk itu.

**Migrasi dari NextAuth (2026-09-10):** baris `User` lama diberi `clerkId` placeholder
(`user_placeholder_<id>`) oleh migration `clerk_auth` — harus diganti manual dengan
Clerk user id asli (buat akunnya dulu di Clerk dengan email yang sama) sebelum user
itu bisa login.

### Components

- `components/ui/` — shadcn/ui primitives (radix-ui based); do not edit these manually, use the `shadcn` CLI
- `components/dashboard/` — shared dashboard pieces: `DataTable`, `TablePagination`, `TableSorter`, `SearchDataTable`, `DashboardSidebar`, `Navbar`, `PageHeader`
- `components/auth/` — login form dan layout pieces
- `components/admin/LocationMap.tsx` — peta Leaflet + OpenStreetMap (pin bisa digeser, lingkaran radius). Leaflet menyentuh `window` saat modul dimuat, jadi selalu diimpor lewat `next/dynamic` dengan `ssr: false`

### Providers

`providers/Providers.tsx` wraps the app in `QueryClientProvider` → `ThemeProvider` (next-themes, default dark). Both are client components.

### Styling

Tailwind v4 (PostCSS plugin). Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.

## Mobile-parity project

We're rebuilding the `md:hidden` (<768px) web experience to be an exact
clone of the sibling Expo app at `../mobile` (relative to this `dashboard/`
folder — i.e. `attendance-system-tam/mobile`), reusing this app's existing
backend. Full plan and screen-by-screen status: `MOBILE_PARITY.md`.

### Hard rules

1. Never change desktop UI (`md:` and up). Never modify `../mobile` source.
2. Never duplicate or rewrite backend logic — reuse existing API routes,
   server actions, `lib/session.ts` auth, and hooks. If backend support is
   missing, stop and ask instead of inventing an endpoint.
3. Mobile components live in `components/mobile/`. Pages switch trees with
   CSS only (`md:hidden` / `hidden md:block`), never JS width detection.
   Both trees share the same data layer (React Query hooks, server data).
4. Copy NativeWind classNames from `../mobile` verbatim wherever possible —
   design tokens are already kept in sync between `dashboard/app/globals.css`
   and `../mobile/global.css` (same oklch values, same variable names).
5. RN → web conversion rules:
   - `<View>` → `<div>` **with `flex flex-col` added** (RN defaults to column
     flexbox; web divs default to block).
   - `<Text>` → `<span>`/`<p>` with its own explicit font, size, weight,
     line-height, and color classes (web inherits; RN doesn't).
   - `Pressable`/`TouchableOpacity` → `<button>` or `<Link>`, keep pressed
     feedback via `active:` classes.
   - `TextInput` → `<input>`/`<textarea>` with matching styles, `type`, and
     `inputMode`.
   - `ScrollView`/`FlatList` → overflow containers + `.map()`; add `min-h-0`
     inside `flex-1` parents.
   - `numberOfLines` → `line-clamp-*`.
   - `SafeAreaView` → `env(safe-area-inset-*)` padding.
   - Drop `ios:`/`android:`/`native:` variants; keep `web:` variants
     unprefixed.
   - Elevation → closest Tailwind shadow.
   - `@react-native-vector-icons/ionicons` → `lucide-react` or an Ionicons
     web set, mapped 1:1 by icon name/size/stroke (see `components/icon.tsx`
     in the mobile app for the tone→color mapping to replicate).
   - The mobile app's bottom-sheet pattern (`Modal transparent
     animationType="slide"`, used by every drawer/picker) needs a web
     "Sheet" component — build it on top of `components/ui/drawer.tsx` or
     `dialog.tsx` (Radix), not a new dependency.
   - `Alert.alert(...)` (used for all success/error feedback, since the
     mobile app has no toast library) → `sonner` toast (already used on
     desktop web).
   - Camera (`expo-camera`) and location (`expo-location`) → browser
     `getUserMedia`/`navigator.geolocation`; handle permission-denied and
     unsupported states explicitly. `dashboard/components/employee/
     AttendanceDialog.tsx` already has a working `getUserMedia` capture
     pattern for desktop — the mobile capture screen should reuse that
     approach, not re-invent it.
6. Keep the app building at every step. Run `npm run lint` and `tsc
   --noEmit` after each screen.

### Visual verification loop (mandatory after every section/state)

1. Start both servers: `npm run dev` (this app, port 3000) and the mobile
   reference server (see below, port 8081). Re-run `npm run parity:auth` if
   sessions have expired (saved to `parity-auth/*.json`, gitignored).
2. `npm run parity:compare -- --name <screen> --web <route> --mobile
   <mobile-route>` (add `--steps <file>` for interactive states, `--mask
   <selector>` for dynamic content like clocks).
3. Open and **look at** `parity-output/<screen>/{web,mobile,diff}.png` —
   don't rely on the printed percentage alone.
4. List every visible difference (spacing, font, weight, color, radius,
   shadow, icon size, alignment, missing/extra elements), fix, repeat.
5. After finishing a screen, also run `npm run parity:capture -- --url
   <route> --out <path> --desktop` and confirm desktop is unchanged.
6. Record the final diff % in `MOBILE_PARITY.md`.

### Mobile reference server (Expo web)

Do **not** use `npx expo start --web` (Metro dev server) as the reference —
Expo SDK 57's `expo-secure-store` web shim throws `getValueWithKeyAsync is
not a function` inside a `useEffect` in `../mobile/src/app/_layout.tsx` on
every route mount, which triggers an uncaught-error LogBox overlay that
intercepts pointer events and blocks Playwright automation. This is a bug
in the mobile app's SDK/web-shim combination, not something to fix (mobile
source is off-limits) — the overlay doesn't appear in a production-style
static export, so use that instead:

```bash
cd ../mobile && npx expo export -p web   # writes ../mobile/dist
cd ../mobile/dist && npx serve -l 8081 -s .
```

Re-run `expo export -p web` whenever you need to confirm something against
a freshly-loaded reference (rare, since mobile source doesn't change during
this project). `parity:auth`/`parity:compare` default to
`http://localhost:8081` for the mobile side (override with
`PARITY_MOBILE_WEB_URL`).

### Parity scripts (`scripts/parity/`)

- `save-auth.mjs` — logs into both apps with the test account, saves
  Playwright storage state to `parity-auth/{web,mobile}.json`.
- `compare.mjs` — captures both sides at 390×844 @3x (mobile) or against a
  static reference PNG, diffs with pixelmatch, writes
  `parity-output/<name>/{web,mobile,diff}.png`, prints % difference.
- `capture.mjs` — single screenshot of any URL at mobile or desktop
  (1440×900) size, for spot-checks.
- `lib.mjs` — shared Playwright helpers (viewport/context setup, animation
  disabling, font-ready waiting, selector masking).

Git Bash mangles a leading `/route` arg into a Windows path — prefix
commands with `MSYS_NO_PATHCONV=1` when running these scripts directly
(not needed through `npm run parity:*` most of the time, but safe to
always add).
