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
verifikasi wajah + GPS, klaim WFH/dinas luar yang butuh approval admin,
pengajuan izin/cuti, dan rekap untuk admin.
Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL,
Auth.js v5 (credentials), TanStack Query + Table, shadcn/ui.

### Route groups

- `app/(auth)/` — `/login` (redirect ke dashboard sesuai role kalau sudah login)
- `app/(employee)/` — `/dashboard`, `/riwayat`, `/izin` — butuh session role `EMPLOYEE`
- `app/(admin)/` — `/admin/dashboard`, `/admin/kehadiran`, `/admin/rekapan-karyawan`, `/admin/izin`, `/admin/verifikasi`, `/admin/laporan`, `/admin/lokasi`, `/admin/waktu-kerja`, `/admin/hari-libur` — butuh session role `ADMIN`
- `app/(account)/` — `/profil` — cukup `requireUser()`, dipakai kedua role
- `app/action/` — Next.js Server Actions (semua file `"use server"`)
- `app/api/images/[filename]/` — serve foto absensi dari `uploads/images/` di disk
- `app/api/laporan/` — download rekap absensi CSV (cek role ADMIN sendiri, balas 403 bukan redirect)

`proxy.ts` (Next 16 menggantikan `middleware.ts`) menjaga route berdasarkan role.

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
  `OUTSIDE_RADIUS_MODES` (yang boleh dipilih karyawan), `APPROVAL_MODES` (yang boleh dipilih admin),
  dan `isLateEligible()`. Bebas Prisma seperti `work-schedule.ts`.
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
`HADIR_DIKANTOR` | `WFH` | `DINAS_LUAR` | `SAKIT` | `IZIN` | `ALFA` | `CUTI`.
`DayStatus` = tujuh itu + `LIBUR` (hari yang tidak menuntut kehadiran, bukan
klasifikasi kehadiran — tanpa dia setiap akhir pekan terbaca `ALFA`).
`CalendarStatus` = `DayStatus` + `KOSONG`.

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

**Absen di luar radius + approval.** Absen di dalam radius selalu
`HADIR_DIKANTOR`, langsung sah. Absen di **luar** radius mewajibkan karyawan
memilih `WFH` atau `DINAS_LUAR` (`OUTSIDE_RADIUS_MODES`) **beserta penjelasannya**
(`workModeDetail`, minimal 5 karakter), lalu disimpan dengan
`approvalStatus = PENDING`. Klaim itu **tidak pernah** dihitung terlambat.

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

**Pencatatan manual admin.** Fitur pengajuan koreksi absensi sudah dihapus.
Penggantinya `createManualAttendance()` + `ManualAttendanceDialog` di
`/admin/kehadiran`: admin mengisi sendiri jam absen yang terlewat, tanpa antrean
review. Barisnya ditandai `isManual` dengan `photoUrl`/koordinat null dan alasan
wajib di `reviewNote`. Karyawan tidak punya jalur pengajuan apa pun untuk ini —
konsekuensinya sidebar karyawan tidak punya badge notifikasi lagi
(`NotificationService.forUser()` mengembalikan `{}` untuk `EMPLOYEE`).

**Akurasi GPS.** `Attendance.accuracyMeters` selalu disimpan. Absensi ditolak kalau
akurasinya lebih buruk dari `WorkSchedule.maxAccuracyMeters` (default 100 m, diatur
admin di menu Waktu Kerja) — dicek di client supaya karyawan bisa membaca ulang
lokasi, lalu dicek lagi di server sebagai penentu.

**Absensi menggantung** (absen masuk ada, absen pulang tidak pernah tercatat)
sengaja tidak ditutup oleh cron. Statusnya dihitung saat render lewat
`isMissingCheckOut()`, jadi tidak pernah ada baris `CHECK_OUT` palsu di database —
kalau jam pulangnya perlu ada, admin mencatatnya manual di `/admin/kehadiran`.

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

- **User** — akun karyawan/admin; login pakai `email` + `passwordHash` (bcrypt); role `EMPLOYEE` / `ADMIN`; `isActive` untuk nonaktifkan karyawan
- **OfficeLocation** — titik kantor (lat/long) + `radiusMeters`; dipakai untuk validasi jarak (haversine)
- **WorkSchedule** — kebijakan global: `lateToleranceMinutes` (satu baris aktif)
- **WorkDay** — selalu 7 baris, `dayOfWeek` unik (0 = Minggu … 6 = Sabtu, sama dengan `Date#getUTCDay()`) + `isWorkingDay` + jam masuk/pulang (`"HH:mm"`). Menentukan `isLate` dan hari libur — tidak ada lagi asumsi Sabtu/Minggu di kode
- **Attendance** — satu baris per `CHECK_IN`/`CHECK_OUT`; unik per (`userId`, `workDate`, `type`) supaya tidak dobel; simpan foto, koordinat, `distanceMeters`, `isWithinRadius`, `isLate`, `workMode`, `workModeDetail`, `approvalStatus`, `approvedMode`. `photoUrl` / `latitude` / `longitude` / `isWithinRadius` **nullable** — absensi yang dicatat admin manual (`isManual`) memang tidak punya foto & GPS, jadi jangan perlakukan null sebagai "di luar radius"
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

Auth.js v5 (`next-auth`) dengan credentials provider (email + password, bcrypt) dan session JWT
— tidak ada tabel session di DB.

```
auth.config.ts   ← config tanpa DB (pages, session, callback jwt/session) + defaultRouteForRole()
auth.ts          ← NextAuth lengkap: Credentials provider, cek bcrypt + isActive
proxy.ts         ← optimistic check: baca role dari cookie JWT, redirect sesuai role
lib/session.ts   ← DAL: getCurrentUser / requireUser / requireRole (cek ulang ke DB, di-cache per request)
types/next-auth.d.ts ← augmentasi Session/User/JWT dengan `id` + `role`
```

Layout `(employee)` dan `(admin)` memanggil `requireRole()`, jadi user yang dinonaktifkan
langsung kehilangan akses walau token-nya masih valid. Error login dibedakan lewat `code`
pada subclass `CredentialsSignin` (`invalid_credentials`, `inactive_account`).

### Components

- `components/ui/` — shadcn/ui primitives (radix-ui based); do not edit these manually, use the `shadcn` CLI
- `components/dashboard/` — shared dashboard pieces: `DataTable`, `TablePagination`, `TableSorter`, `SearchDataTable`, `DashboardSidebar`, `DashboardNavbar`, `DynamicBreadcrumb`, `PageHeader`
- `components/auth/` — login form dan layout pieces
- `components/admin/LocationMap.tsx` — peta Leaflet + OpenStreetMap (pin bisa digeser, lingkaran radius). Leaflet menyentuh `window` saat modul dimuat, jadi selalu diimpor lewat `next/dynamic` dengan `ssr: false`

### Providers

`providers/Providers.tsx` wraps the app in `QueryClientProvider` → `ThemeProvider` (next-themes, default dark). Both are client components.

### Styling

Tailwind v4 (PostCSS plugin). Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.
