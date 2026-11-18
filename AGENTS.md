<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Panduan Standar Agen & Integrasi Skills (Attendance TAM)

Repositori ini telah dikonfigurasi dengan skill modular di `.agents/skills/`. Agen WAJIB mematuhi **Alur Kerja Standar (4 Langkah Wajib)** serta menerapkan skills yang relevan dengan arsitektur proyek (Next.js 16, React 19, Prisma v7 `@prisma/adapter-pg`, PostgreSQL, Clerk Auth, Tailwind CSS v4, Sonner, Playwright).

---

## ⚡ Alur Kerja Standar (4 Langkah Wajib)

Setiap pengerjaan tugas, penambahan fitur, perbaikan bug, atau refaktorisasi HARUS mematuhi urutan 4 langkah berikut:

```
┌─────────────────┐     ┌────────────────────────┐     ┌───────────────────┐     ┌─────────────────────────────┐
│ 1. PERENCANAAN  │ ──> │ 2. KODING/IMPLEMENTASI │ ──> │ 3. AUDIT KEAMANAN │ ──> │ 4. VERIFIKASI SEBELUM PUSH  │
│ (writing-plans) │     │(vercel & prisma api)   │     │ (vibe-security)   │     │ (verification & tsc/lint)   │
└─────────────────┘     └────────────────────────┘     └───────────────────┘     └─────────────────────────────┘
```

### 1. Mulai dengan `writing-plans` untuk Menyusun Rencana Perubahan
- **Sebelum menyentuh atau memodifikasi kode**, susun rencana kerja terstruktur menggunakan skill `writing-plans`.
- Petakan file yang akan disentuh, dependensi antar komponen, serta potensi efek samping.
- Untuk eksplorasi ide baru atau fitur besar, kombinasikan dengan `brainstorming`, `/to-spec`, atau `/to-tickets`.

### 2. Terapkan Pola `vercel-react-best-practices` dan `prisma-client-api` saat Coding
- **Frontend & App Router**:
  - Terapkan panduan dari `vercel-react-best-practices` untuk Next.js 16 dan React 19 (Server Components secara default, minimalkan `'use client'`, streaming dengan `Suspense`, data fetching paralel, serialisasi props yang efisien).
  - Terapkan `vercel-composition-patterns` untuk modularitas komponen UI dan pemisahan logika container vs presentational.
  - Terapkan `tailwind-4-docs` untuk styling CSS-first Tailwind CSS v4 tanpa konfigurasi usang.
  - Terapkan `ask-sonner` untuk seluruh notifikasi toast (feedback sukses, error, loading promise).
- **Backend, Database & Otentikasi**:
  - Terapkan panduan dari `prisma-client-api` untuk penulisan model queries, filter, relasi, batch mutations, dan transaksi `$transaction`.
  - Terapkan `prisma-driver-adapter-implementation` untuk koneksi driver adapter `@prisma/adapter-pg` pada PostgreSQL.
  - Terapkan `clerk-nextjs-patterns` untuk sesi, auth guards di Server Actions, route middleware, dan proteksi endpoint.
  - Terapkan `clerk-backend-api` ketika membutuhkan manipulasi akun atau sinkronisasi melalui backend REST API Clerk.

### 3. Jalankan `vibe-security` untuk Memvalidasi Keamanan Sebelum Commit
- Sebelum melakukan commit kode ke Git, jalankan evaluasi kepatuhan keamanan dengan skill `vibe-security`:
  - **Akses Kontrol & RBAC (Multi-Tier)**: Pastikan otorisasi peran (`ADMIN`, `MANAGER`, `SUPERVISOR`, `EMPLOYEE`) divalidasi ketat pada Server Actions (`requireRole`, `requireAnyRole` dari `lib/session.ts`) dan API Routes (`requireApiRole`, `requireApiAnyRole` dari `lib/api-auth.ts`) — jangan hanya mengandalkan proteksi UI/client-side:
    - `ADMIN`: Hak akses penuh master data (pengguna, lokasi/kantor, shift waktu kerja, hari libur) dan rekapitulasi kehadiran global.
    - `MANAGER`: Persetujuan tahap akhir izin/cuti/lembur (`LeaveStage.MANAGER`) dan review penugasan dinas luar (`field-assignment`).
    - `SUPERVISOR`: Verifikasi absensi di luar radius kantor, persetujuan tahap awal izin/cuti/lembur (`LeaveStage.SUPERVISOR`), serta pengajuan dinas luar.
    - `EMPLOYEE`: Akses mandiri untuk check-in/out, pengajuan permohonan izin/cuti/lembur, dan melihat riwayat kehadiran pribadi.
  - **Verifikasi Sesi & Identitas**: Pastikan setiap mutasi data memverifikasi `auth().userId` dari Clerk dan memastikan user hanya mengakses atau memodifikasi data miliknya sendiri (kecuali role atasan `SUPERVISOR`/`MANAGER` atau `ADMIN` sesuai hierarki kewenangannya).
  - **Validasi Input & Payload**: Gunakan skema validasi (Zod) untuk semua payload request guna mencegah injection atau manipulasi state ilegal.
  - **Proteksi File Upload**: Validasi tipe MIME, ukuran file maksimal, serta simpan file pada direktori yang aman.

### 4. Lakukan `verification-before-completion` (`tsc` & `lint`) Sebelum Push ke GitHub
- Jangan pernah mengklaim tugas selesai atau melakukan `git push` sebelum menjalankan verifikasi teknis secara nyata:
  - **TypeScript Check**: Jalankan `npx tsc --noEmit` dan pastikan **0 error**.
  - **ESLint Check**: Jalankan `npm run lint` dan pastikan tidak ada blocking linting error pada file terkait.
  - **Verifikasi Fungsional / Uji Coba**: Uji alur yang diubah untuk memastikan ketiadaan regresi perilaku (gunakan `verify-and-stop` atau `playwright-cli` jika relevan).
  - Prinsip wajib: **Evidence before assertions** — konfirmasi output terminal terlebih dahulu sebelum push ke remote branch.

---

## 📦 Katalog Lengkap Skills Terpasang & Implementasinya

Skills modular tersimpan di direktori `.agents/skills/`. Gunakan skill yang tepat sesuai domain pengerjaan:

### 1. Framework, UI & State Management
| Skill | Penerapan pada Attendance TAM |
| :--- | :--- |
| `vercel-react-best-practices` | Panduan performa Next.js 16/React 19, optimasi Server Components, bundling, dan cache lifecycle. |
| `vercel-composition-patterns` | Pola komposisi komponen fleksibel, compound components (dialog, filter, data table). |
| `tailwind-4-docs` | Sintaksis utilitas Tailwind CSS v4, variabel CSS tema gelap/terang, dan varian state. |
| `ask-sonner` | Konfigurasi Toaster, positioning, tema, serta penanganan feedback toast promise/error. |

### 2. Database & ORM (Prisma v7 + PostgreSQL)
| Skill | Penerapan pada Attendance TAM |
| :--- | :--- |
| `prisma-client-api` | Penulisan query CRUD (`findMany`, `create`, `update`, `upsert`), filter relasi pegawai & absensi. |
| `prisma-driver-adapter-implementation` | Manajemen driver adapter `@prisma/adapter-pg`, pool koneksi, dan eksekusi transaksi database. |
| `prisma-cli` | Referensi perintah CLI Prisma 7 (`prisma migrate`, `prisma generate`, `prisma db seed`). |
| `prisma-orm-setup` | Troubleshooting koneksi database PostgreSQL, pooling, dan variabel environment `DATABASE_URL`. |

### 3. Autentikasi & Manajemen Akun (Clerk)
| Skill | Penerapan pada Attendance TAM |
| :--- | :--- |
| `clerk-nextjs-patterns` | Proteksi rute middleware, server-side auth checking, Server Actions security guards. |
| `clerk-backend-api` | Integrasi Clerk REST API untuk sinkronisasi akun, role update, dan verifikasi status pengguna. |
| `clerk-custom-ui` | Kustomisasi form autentikasi (request account, sign in, reset password, hooks `useAuth`/`useUser`). |
| `clerk-testing` | Panduan pengujian E2E untuk flow login, logout, dan session switching. |
| `clerk-expo` | Acuan standar otentikasi Clerk apabila sistem diintegrasikan dengan aplikasi mobile React Native / Expo TAM. |

### 4. Pengujian & Paritas (Testing & Parity QA)
| Skill | Penerapan pada Attendance TAM |
| :--- | :--- |
| `playwright-cli` | Otomasi browser untuk verifikasi antarmuka admin, dashboard employee, dan form request account. |
| `playwright-best-practices` | Struktur penulisan test E2E yang tangguh, penanganan locator berbasis peran/aksesibilitas, mitigasi flakiness. |
| `e2e-testing-patterns` | Skenario pengujian end-to-end menyeluruh untuk siklus absensi dan perizinan. |

### 5. Debugging, Refaktorisasi & Bug Fixing
| Skill | Penerapan pada Attendance TAM |
| :--- | :--- |
| `investigate-first` | Investigasi akar masalah berdasarkan bukti log dan state sebelum melakukan editing kode. |
| `systematic-debugging` | Protokol pelacakan bug 4-fase untuk mendiagnosis isu tak terduga secara sistematis. |
| `surgical-patch` | Perbaikan bug pada lapisan kode tersempit tanpa menciptakan efek samping atau perubahan tak perlu. |
| `safe-refactor` | Restrukturisasi kode dengan penjagaan verifikasi sebelum dan sesudah refactoring. |
| `codebase-design` | Penataan antarmuka modul (deep module) agar mudah dipelihara dan diuji. |

### 6. Dokumentasi, Gaya Komunikasi & Efisiensi
| Skill | Penerapan pada Attendance TAM |
| :--- | :--- |
| `no-ai-slop` | Menjaga dokumentasi dan komunikasi langsung pada substansi teknis tanpa basa-basi artifisial. |
| `antislop-code` | Menjaga kebersihan komentar kode agar hanya memuat penjelasan teknis yang esensial. |
| `caveman` | Mode ringkas hemat token jika pengguna meminta jawaban singkat atau berformat padat. |
