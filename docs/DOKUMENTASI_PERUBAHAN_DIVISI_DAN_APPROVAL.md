# Dokumentasi Komprehensif: Restrukturisasi Divisi & Jabatan serta Penyelarasan Alur Approval

Dokumen ini mencatat seluruh perubahan teknis dari codebase lama ke codebase baru pada branch `dev/dika`, mencakup arsitektur data, penyesuaian alur bisnis approval, refaktorisasi UI daftar pekerja, daftar lengkap file yang disentuh, status git terhadap branch `origin/dev/dika` dan `origin/master`, serta panduan pelaksanaan (*runbook / SOP*) untuk lingkungan development maupun produksi (*production deployment*).

---

## 📑 Daftar Isi
1. [Latar Belakang & Analisis Masalah Codebase Lama](#1-latar-belakang--analisis-masalah-codebase-lama)
2. [Arsitektur Solusi Baru](#2-arsitektur-solusi-baru)
3. [Daftar Lengkap & Rincian Perubahan File (Cross-Check Git)](#3-daftar-lengkap--rincian-perubahan-file-cross-check-git)
4. [Status Git & Topologi Branch (dev/dika vs Original Master)](#4-status-git--topologi-branch-devdika-vs-original-master)
5. [Matriks Pemetaan Data Eksisting](#5-matriks-pemetaan-data-eksisting)
6. [Panduan Penerapan di Lingkungan Development](#6-panduan-penerapan-di-lingkungan-development)
7. [Panduan Penerapan di Production (Deployment SOP)](#7-panduan-penerapan-di-production-deployment-sop)
8. [Rencana Rollback & Mitigasi Risiko](#8-rencana-rollback--mitigasi-risiko)
9. [Status Verifikasi Teknis](#9-status-verifikasi-teknis)

---

## 1. Latar Belakang & Analisis Masalah Codebase Lama

### A. Masalah Jabatan Teks Bebas (*Unstructured Position*)
Pada codebase lama:
- Kolom `position` pada tabel `User` hanya berupa `String?` bebas tanpa validasi master data.
- Input jabatan pada form pembuatan dan pengeditan karyawan berupa `<input type="text" placeholder="Staff" />`, menyebabkan variasi penulisan yang tidak seragam (contoh: `Teknisi`, `Teknisi (EoS)`, `Programmer`, `HR Admin`).
- Tidak ada konsep pengelompokan divisi perusahaan, sehingga sulit melakukan klasifikasi divisi dan pengaturan hierarki organisasi.
- Pada tabel daftar pekerja (`WorkerTable`), nama jabatan hanya disisipkan sebagai teks kecil abu-abu di bawah nama karyawan, tidak memiliki kolom mandiri, tidak dapat difilter per jabatan, dan tidak terindeks dalam kotak pencarian teks.

### B. Masalah Alur & Visibilitas Approval (Izin, Cuti, Lembur)
Pada codebase lama:
- Halaman peninjauan Manager (`/manager/izin` dan `/manager/lembur`) menampilkan **seluruh** pengajuan izin dan lembur di perusahaan, termasuk pengajuan milik karyawan staf (*Employee*).
- Hal ini menimbulkan tumpang tindih operasional bagi Manajer, karena secara bisnis Manajer hanya berkewajiban menyetujui pengajuan langsung dari **Supervisor**, sementara pengajuan staf diselesaikan sepenuhnya oleh Supervisor masing-masing.

---

## 2. Arsitektur Solusi Baru

### A. Hierarki Organisasi: Role $\rightarrow$ Division $\rightarrow$ Position
1. **Entitas `Division`**:
   - Menampung nama kelompok divisi kerja (misal: *Teknisi*, *Admin*, *General*).
   - Memiliki batasan unik pada kolom `name`.
2. **Entitas `Position`**:
   - Menampung nama jabatan spesifik di bawah suatu divisi.
   - Berelasi `many-to-one` dengan `Division` (`onDelete: Cascade`).
   - Memiliki batasan unik komposit `@@unique([divisionId, name])` untuk mencegah duplikasi nama jabatan dalam satu divisi yang sama.
3. **Pola Transisi Kompatibilitas (*Expand & Contract Pattern*)**:
   - Kolom lama `User.position` (*string*) **tidak dihapus** untuk menjamin *zero downtime* dan kompatibilitas 100% pada kode pelaporan, export Excel, dan antarmuka lain.
   - Kolom baru `divisionId` dan `positionId` ditambahkan pada `User`.
   - Setiap mutasi akun karyawan otomatis menyinkronkan nama jabatan terpilih ke kolom `User.position`.

### B. Cascading Selection pada Form UI
- Admin memilih **Divisi** terlebih dahulu.
- Pilihan dropdown **Jabatan** otomatis terfilter secara reaktif hanya menampilkan jabatan yang tersedia pada divisi terpilih.

### C. Restrukturisasi Tabel Pekerja (`WorkerTable`)
- Kolom tabel kini memisahkan **Divisi** (Badge outline) dan **Jabatan** (kolom mandiri).
- Fitur pencarian (`search`) mengindeks gabungan `name`, `phone`, `email`, `divisionName`, dan `position`.
- Filter tabel dilengkapi dua dropdown terpisah: filter berdasarkan **Divisi** dan filter berdasarkan **Jabatan**.

### D. Penyelarasan Hak Review & Visibilitas
- **Supervisor**: Meninjau pengajuan staf (`user.role === Role.EMPLOYEE`) yang berada di **divisi yang sama** (`request.user.divisionId === reviewer.divisionId`). Proteksi diterapkan dua lapis: penyaringan antarmuka pada `/supervisor/izin` dan `/supervisor/lembur`, serta verifikasi integritas pada server action `leave.action.ts` dan `overtime.action.ts`.
- **Manager**: Meninjau pengajuan supervisor (`user.role === Role.SUPERVISOR` / `stage === LeaveStage.MANAGER`).
- **Admin**: Tetap memiliki akses rekapitulasi menyeluruh ke seluruh pengajuan untuk pengawasan terpusat (*global oversight*).

---

## 3. Daftar Lengkap & Rincian Perubahan File (Cross-Check Git)

Berdasarkan hasil *cross-check* terhadap `git status` dan `git diff` pada branch `dev/dika`, seluruh 33 file (23 file termodifikasi + 10 file baru/untracked) tercatat secara presisi berikut ini:

### 🗄️ Database & Schema (4 File)
| File | Status Git | Deskripsi Perubahan |
| :--- | :---: | :--- |
| `prisma/schema.prisma` | **Modified** | Menambahkan model `Division`, `Position`, serta relasi `divisionId`/`division` dan `positionId`/`jobPosition` pada model `User`. |
| `prisma/migrations/20261108173557_add_division_and_position/migration.sql` | **New (Untracked)** | File migrasi SQL DDL untuk membuat tabel `Division`, `Position`, indeks unik, serta *foreign keys* ke tabel `User`. |
| `prisma/seed.ts` | **Modified** | Menambahkan *upsert* 3 divisi default (`Teknisi`, `Admin`, `General`) dan seluruh jabatannya (posisi `Programmer` dan `Network Engineer` berada di bawah divisi `Teknisi`), serta menghubungkan akun seed Admin ke divisi `Admin` dan jabatan `HR Admin`. |
| `scripts/migrate-divisions-positions.ts` | **New (Untracked)** | Skrip TypeScript *idempotent* untuk menginisialisasi divisi & jabatan (3 divisi default, posisi terpisah `Programmer` dan `Network Engineer` di bawah `Teknisi`, serta pembersihan otomatis legacy divisi `Engineer` dan posisi lama `Programmer and Network Engineer` jika ada) serta memetakan pengguna eksisting di database. |

### ⚙️ Backend, Validators & Actions (8 File)
| File | Status Git | Deskripsi Perubahan |
| :--- | :---: | :--- |
| `servers/validators/division.validator.ts` | **New (Untracked)** | Skema validasi Zod untuk pembuatan/pembaruan divisi (`CreateDivisionSchema`) dan jabatan (`CreatePositionSchema`). |
| `servers/validators/user.validator.ts` | **Modified** | Menambahkan properti `divisionId` dan `positionId` (opsional) pada `CreateUserSchema` dan `UpdateUserSchema`. |
| `servers/services/division.service.ts` | **New (Untracked)** | Service Prisma untuk CRUD divisi dan jabatan, dilengkapi penghitungan anggota (`_count`) dan proteksi penghapusan jika masih ada pengguna aktif. |
| `servers/services/user.service.ts` | **Modified** | Memperbarui `UserService.list()` dan `UserService.getById()` agar otomatis mengikutsertakan relasi `include: { division: true, jobPosition: true }`. |
| `app/action/division.action.ts` | **New (Untracked)** | Server Actions terproteksi `Role.ADMIN` untuk operasi CRUD divisi dan jabatan dengan revalidasi path dinamis. |
| `app/action/user.action.ts` | **Modified** | Menyinkronkan `divisionId`, `positionId`, dan nama jabatan ke kolom `position` string pada fungsi `createEmployee`, `updateEmployee`, dan `createEmployeeFull`. |
| `app/action/leave.action.ts` | **Modified** | Menambahkan validasi pembatasan review izin: Supervisor hanya dapat menyetujui staf `Role.EMPLOYEE` di divisi yang sama; Manager hanya menyetujui `Role.SUPERVISOR`. |
| `app/action/overtime.action.ts` | **Modified** | Menambahkan validasi pembatasan review lembur: Supervisor hanya dapat menyetujui staf `Role.EMPLOYEE` di divisi yang sama; Manager hanya menyetujui `Role.SUPERVISOR`. |

### 🖥️ Antarmuka Pengguna (UI) Admin, Form & Profil (12 File)
| File | Status Git | Deskripsi Perubahan |
| :--- | :---: | :--- |
| `lib/sidebar-menu.ts` | **Modified** | Menambahkan item navigasi menu **"Divisi & Jabatan"** (`/admin/divisi-jabatan`) pada grup Pengaturan Admin serta menu **"Izin Saya"** (`/supervisor/izin-saya`) pada grup General Supervisor. |
| `app/(admin)/admin/divisi-jabatan/page.tsx` | **New (Untracked)** | Halaman utama manajemen master data divisi dan jabatan (berisi kartu statistik dan tab interaktif). |
| `components/admin/DivisionManagement.tsx` | **New (Untracked)** | Komponen UI tab Divisi: tabel daftar divisi, modal dialog tambah/edit divisi, dan dialog konfirmasi hapus. |
| `components/admin/PositionManagement.tsx` | **New (Untracked)** | Komponen UI tab Jabatan: tabel jabatan dengan filter divisi, modal dialog tambah/edit jabatan, dan konfirmasi hapus. |
| `components/admin/CreateEmployeeForm.tsx` | **Modified** | Mengganti input teks bebas jabatan dengan *cascading select* (Pilih Divisi &rarr; Dropdown Jabatan terfilter). |
| `components/admin/EditEmployeeAccountForm.tsx` | **Modified** | Mengganti input teks jabatan pada form edit akun dengan *cascading select* terhubung ke master data divisi. |
| `app/(admin)/admin/daftar-pekerja/page.tsx` | **Modified** | Mengambil relasi divisi & posisi terstruktur dari `UserService.list()` dan `DivisionService.list()`, mengekstraksi opsi filter divisi & jabatan, serta meneruskannya ke `WorkerTable`. |
| `components/admin/WorkerTable.tsx` | **Modified** | Mengadopsi skema user terbaru: kolom tersendiri untuk `Divisi` (Badge) dan `Jabatan`, pencarian mencakup divisi/jabatan, serta filter dropdown `SelectDataTable` untuk Divisi dan Jabatan. |
| `app/(admin)/admin/daftar-pekerja/baru/page.tsx` | **Modified** | Mengambil master data divisi dari `DivisionService.list()` dan meneruskannya ke form pembuatan karyawan. |
| `app/(admin)/admin/daftar-pekerja/[id]/edit/page.tsx` | **Modified** | Mengambil daftar divisi secara paralel dalam `Promise.all` dan meneruskannya ke form edit akun karyawan. |
| `app/(admin)/admin/daftar-pekerja/[id]/page.tsx` | **Modified** | Menampilkan label informasi Divisi dan Jabatan terstruktur pada kartu profil detail karyawan. |
| `app/(account)/profil/page.tsx` | **Modified** | Mengambil data divisi & jabatan pengguna terstruktur dari `UserService.getById()` dan menampilkannya pada profil akun pribadi. |

### ⚖️ Penyelarasan Halaman Manager & Supervisor (6 File)
| File | Status Git | Deskripsi Perubahan |
| :--- | :---: | :--- |
| `app/(manager)/manager/izin/page.tsx` | **Modified** | Memfilter daftar pengajuan izin agar hanya menampilkan permohonan dari `Role.SUPERVISOR`. |
| `app/(manager)/manager/lembur/page.tsx` | **Modified** | Memfilter daftar pengajuan lembur agar hanya menampilkan permohonan dari `Role.SUPERVISOR`. |
| `app/(supervisor)/supervisor/izin/page.tsx` | **Modified** | Memfilter pengajuan izin agar terfokus pada permohonan dari staf `Role.EMPLOYEE` pada divisi yang sama dengan supervisor. |
| `app/(supervisor)/supervisor/lembur/page.tsx` | **Modified** | Memfilter pengajuan lembur agar terfokus pada permohonan dari staf `Role.EMPLOYEE` pada divisi yang sama dengan supervisor. |
| `app/(supervisor)/supervisor/lembur-saya/page.tsx` | **Modified** | Memperbaiki teks subtitle menjadi `"Ajukan lembur untuk diri sendiri — menunggu persetujuan manager."`. |
| `app/(supervisor)/supervisor/izin-saya/page.tsx` | **New (Untracked)** | Halaman mandiri pengajuan izin/cuti/sakit untuk Supervisor (`/supervisor/izin-saya`) yang merender formulir pengajuan diri sendiri. |

### 🛠️ Konfigurasi Repositori & Dokumentasi Terkait (3 File)
| File | Status Git | Deskripsi Perubahan |
| :--- | :---: | :--- |
| `.gitignore` | **Modified** | Menambahkan pengabaian folder log server `/errs_form_server/`, direktori internal `/.claude/`, serta direktori dependensi skills `/.agents/`. |
| `AGENTS.md` | **Modified** | Menambahkan instruksi standar alur 4 langkah agen (Planning, Implementation, Security, Verification) serta integrasi skills repositori. |
| `docs/DOKUMENTASI_PERUBAHAN_DIVISI_DAN_APPROVAL.md` | **New (Untracked)** | Dokumen teknis komprehensif ini (analisis, arsitektur, daftar perubahan, SOP deploy produksi & dev, rencana rollback). |

---

## 4. Status Git & Topologi Branch (dev/dika vs Original Master)

### A. Diagram Topologi Git
```
c305e1a (upstream/master, origin/master, master)
   │
   ├── b6191f7 fix: handle empty string clerkId in database seed
   ├── 7a78d95 (origin/dev/dika) feat(auth): redirect /request-account to /login and add contact admin dialog
   │
   └── 400a189 (HEAD -> dev/dika) fix(theme): resolve script tag warning and hydration mismatch in React 19
         │
         └── [WORKING TREE UNCOMMITTED]
               ├── 23 Tracked Files Modified (Fitur Divisi, Approval, WorkerTable, Server Action, Subtitle Lembur Saya, Profil, .gitignore, AGENTS.md)
               └── 10 Untracked Files Added (Migrasi, Services, Validators, Pages, Components, Docs)
```

### B. Rincian Perbandingan Komit
1. **Terhadap `origin/master` (Status Git Original):**
   - Branch `dev/dika` saat ini memuat 3 commit terdahulu (`b6191f7`, `7a78d95`, `400a189`) yang berfokus pada perbaikan seed Clerk, penutupan request-account via dialog kontak admin, dan perbaikan hidrasi React 19 tema gelap.
2. **Terhadap `origin/dev/dika`:**
   - Lokal `dev/dika` berada **1 commit di depan** remote (`400a189`).
   - Seluruh perubahan fitur Divisi, Jabatan, Approval, dan WorkerTable saat ini berada di **working tree (staged/unstaged)** siap untuk di-commit terstruktur sebelum di-push ke remote `origin/dev/dika`.

---

## 5. Matriks Pemetaan Data Eksisting

Seluruh data posisi lama dari pengguna di database telah dipetakan ke divisi dan jabatan standar sebagai berikut:

| Posisi Lama (String) | Role Asal | Divisi Baru | Jabatan Terdaftar Baru | Status Penempatan |
| :--- | :--- | :--- | :--- | :--- |
| `Teknisi` | `EMPLOYEE` | **Teknisi** | `Teknisi` | Terpetakan |
| `Teknisi (EoS)` | `EMPLOYEE` | **Teknisi** | `End of Service` | Terpetakan (Standardisasi) |
| `Supervisor Teknis` | `SUPERVISOR` | **Teknisi** | `Supervisor` | Terpetakan |
| `Admin` | `ADMIN`, `EMPLOYEE` | **Admin** | `Admin` | Terpetakan |
| `HR Admin` | `ADMIN` | **Admin** | `HR Admin` | Terpetakan |
| `Supervisor Admin` | `SUPERVISOR` | **Admin** | `Supervisor` | Terpetakan |
| `Programmer` | `EMPLOYEE` | **Teknisi** | `Programmer` | Terpetakan |
| `Network Engineer` | `EMPLOYEE` | **Teknisi** | `Network Engineer` | Terpetakan |
| `Programmer and Network Engineer` | `EMPLOYEE` | **Teknisi** | `Programmer` | Terpetakan (Standardisasi terpecah) |
| `Business Development Manager` | `MANAGER` | **General** | `Business Development Manager` | Terpetakan |
| `Staff` | `EMPLOYEE` | *NULL* | *NULL* | Belum didefinisikan (diatur via Edit Akun) |
| `Manager` | `MANAGER` | *NULL* | *NULL* | Akun pengetesan |
| *(Kosong / NaN)* | `EMPLOYEE` | *NULL* | *NULL* | Akun pengetesan |

---

## 6. Panduan Penerapan di Lingkungan Development

Untuk menjalankan dan menguji perubahan ini di mesin development lokal:

```bash
# 1. Pastikan berada di branch dev/dika
git checkout dev/dika

# 2. Terapkan migrasi skema database lokal
npx prisma migrate dev

# 3. Jalankan migrasi data divisi & posisi ke database
npx tsx -r dotenv/config scripts/migrate-divisions-positions.ts

# 4. Regenerasi Prisma Client
npx prisma generate

# 5. Jalankan server development
npm run dev
```

---

## 7. Panduan Penerapan di Production (Deployment SOP)

Langkah-langkah berikut wajib dijalankan secara berurutan saat melakukan *release* ke server produksi:

### Tahap 1: Persiapan & Backup Basis Data
Sebelum melakukan deploy, buat backup cadangan database produksi:
```bash
pg_dump -U postgres -d attendance_system -F c -b -v -f "attendance_system_pre_division_backup_$(date +%Y%m%d%H%M%S).dump"
```

### Tahap 2: Tarik Kode Terbaru (*Git Pull*)
Pastikan branch produksi diperbarui dengan commit fitur ini:
```bash
git checkout <production-branch>
git pull origin <production-branch>
```

### Tahap 3: Instalasi Dependensi & Migrasi Skema Basis Data
Jalankan migrasi Prisma menggunakan perintah aman untuk produksi:
```bash
# 1. Pastikan dependensi sinkron
npm ci

# 2. Terapkan file migrasi DDL ke database PostgreSQL produksi
npx prisma migrate deploy

# 3. Regenerasi Prisma Client
npx prisma generate
```
> [!IMPORTANT]
> Jangan gunakan `npx prisma migrate dev` atau `prisma db push` di server produksi. Selalu gunakan `npx prisma migrate deploy`.

### Tahap 4: Eksekusi Skrip Inisialisasi & Migrasi Data Eksisting
Jalankan skrip pemetaan data untuk mengisi tabel `Division`, `Position`, dan menautkan user yang sudah ada:
```bash
npx tsx scripts/migrate-divisions-positions.ts
```
*Output yang diharapkan:*
- Menampilkan konfirmasi pembuatan 3 divisi (`Teknisi`, `Admin`, `General`).
- Menampilkan konfirmasi pembuatan jabatan di masing-masing divisi (termasuk posisi terpisah `Programmer` dan `Network Engineer` di bawah divisi `Teknisi`).
- Menampilkan konfirmasi pembersihan divisi `Engineer` lama serta posisi gabungan `Programmer and Network Engineer` jika sebelumnya sempat dibuat.
- Menampilkan jumlah user yang berhasil dipetakan ke relasi baru.

### Tahap 5: Build & Restart Aplikasi
Kompilasi aplikasi Next.js dan jalankan proses server:
```bash
# 1. Build aplikasi Next.js
npm run build

# 2. Restart layanan aplikasi (sesuai tool yang digunakan, mis. PM2 atau Docker)
# Jika menggunakan PM2:
pm2 restart attendance-tam

# Jika menggunakan Docker / Kubernetes:
docker compose down && docker compose up -d --build
```

### Tahap 6: Verifikasi Pasca-Deploy (*Smoke Testing Checklist*)
- [ ] **Akses Admin (`/admin/divisi-jabatan`)**:
  - Masuk sebagai Admin.
  - Verifikasi tabel Divisi menampilkan 3 divisi (`Teknisi`, `Admin`, `General`) dengan jumlah jabatan dan karyawan yang sesuai.
  - Verifikasi tabel Jabatan dapat difilter per divisi dan jabatan `Programmer` serta `Network Engineer` berada di bawah divisi `Teknisi`.
  - Coba tambahkan 1 divisi pengujian dan 1 jabatan, lalu hapus kembali.
- [ ] **Form Tambah/Edit Karyawan (`/admin/daftar-pekerja/baru`)**:
  - Pilih divisi &rarr; pastikan dropdown jabatan terisi sesuai opsi divisi tersebut.
- [ ] **Tabel Pekerja (`/admin/daftar-pekerja`)**:
  - Verifikasi kolom Divisi dan Jabatan tampil terpisah dengan benar.
  - Coba filter berdasarkan Divisi dan Jabatan.
- [ ] **Halaman Izin & Lembur Manager (`/manager/izin`, `/manager/lembur`)**:
  - Masuk sebagai Manager.
  - Pastikan pengajuan yang tampil hanya yang berasal dari Supervisor.
- [ ] **Halaman Izin & Lembur Supervisor (`/supervisor/izin`, `/supervisor/lembur`)**:
  - Masuk sebagai Supervisor.
  - Pastikan pengajuan yang tampil hanya permohonan dari staf (Employee) pada divisi yang sama.
- [ ] **Halaman Lembur Saya Supervisor (`/supervisor/lembur-saya`)**:
  - Masuk sebagai Supervisor.
  - Pastikan subtitle kartu lembur menampilkan pesan menunggu persetujuan manager.

---

## 8. Rencana Rollback & Mitigasi Risiko

Karena implementasi ini menerapkan strategi **Expand & Contract**:
1. **Tidak Ada Kolom yang Dihapus:** Kolom `User.position` lama tetap utuh, sehingga jika kode aplikasi harus di-rollback ke versi sebelumnya (*git checkout commit_lama*), aplikasi versi lama tetap akan berjalan normal tanpa error skema.
2. **Rollback Migrasi (Jika Darurat):**
   Jika skema basis data perlu dikembalikan secara mutlak ke kondisi sebelum migrasi:
   ```sql
   ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_positionId_fkey";
   ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_divisionId_fkey";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "positionId";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "divisionId";
   DROP TABLE IF EXISTS "Position";
   DROP TABLE IF EXISTS "Division";
   DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261108173557_add_division_and_position';
   ```
   Atau pulihkan (*restore*) dari file dump backup yang telah dibuat pada Tahap 1.

---

## 9. Status Verifikasi Teknis

- **TypeScript Compilation**: `npx tsc --noEmit` &rarr; **0 error** (Lulus).
- **ESLint Quality Check**: `npm run lint` &rarr; **0 error** (Lulus).
- **Prisma Client Generation**: `npx prisma generate` &rarr; **Tersinkronisasi**.
