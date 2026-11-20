Status: resolved
Repo: attendance-tam
Blocked by: 01, 09

# 11 — Routing Pengajuan per Divisi: modul aturan + izin & Lembur

Spec: `../spec.md` (§2 Modul aturan routing). ADR 0002. User story 27–28,
30–39, 42–43.

## Yang dibangun

**Modul aturan routing (bebas Prisma)** — satu-satunya tempat keputusan
"siapa melihat/memutuskan Pengajuan ini":
- Input: reviewer (Role, Divisi atau null), pemohon (Role, Divisi atau null),
  tahap Pengajuan, himpunan Divisi yang punya Supervisor Divisi **aktif**.
- Output: (a) boleh/tidak untuk satu Pengajuan; (b) deskripsi cakupan antrean
  untuk reviewer, yang diterjemahkan service jadi filter Prisma.
- Aturan:
  - SUPERVISOR stage, reviewer Supervisor Divisi D → pemohon Divisi D atau
    pemohon tanpa Jabatan.
  - SUPERVISOR stage, reviewer Supervisor tanpa Jabatan → semua.
  - SUPERVISOR stage, reviewer Manager → hanya pemohon yang Divisinya tidak
    punya Supervisor Divisi aktif.
  - MANAGER stage → semua Manager (tidak berubah).
- Stage awal per Role pemohon **tidak berubah**.

**Penerapan untuk izin/sakit/cuti dan Lembur:**
- Daftar pending di API mobile (`/api/leave/pending`, `/api/overtime/pending`),
  halaman desktop Supervisor/Manager (izin, Lembur), dan tab `/approval` web
  mobile.
- Aksi review izin & Lembur **menolak** reviewer di luar cakupan (bukan hanya
  disembunyikan) — juga untuk panggilan API langsung.
- Badge notifikasi sidebar menghitung dengan cakupan yang sama.
- Routing dihitung saat dibaca — **tidak ada** kolom Divisi baru di tabel
  Pengajuan. `ApprovalLog` tidak diubah.

## Kriteria selesai

- [x] Test (Vitest) satu kasus per aturan: Divisi sama → terlihat; Divisi lain
      → tidak; pemohon tanpa Jabatan → semua Supervisor; Supervisor tanpa
      Jabatan → semua; Divisi tanpa Supervisor aktif → Manager ya, Supervisor
      lain tidak; Supervisor nonaktif tidak dihitung; pemohon Supervisor →
      tahap Manager.
- [x] Supervisor Admin tidak bisa menyetujui izin Teknisi lewat API langsung
      (respons error, data tidak berubah).
- [x] Mobile 1.1.0 tab Review otomatis hanya menampilkan Divisi reviewer
      (tanpa perubahan mobile).
- [x] Tanpa satu pun Jabatan terisi, perilaku identik dengan sebelum fitur ini.
- [x] lint + `tsc --noEmit` + `npm test` hijau.

## Comments

**2026-11-19** — Diimplementasikan:
- Modul aturan domain bebas Prisma di `lib/approval-routing.ts` (`canReviewRequest`, `getApprovalScope`, `resolveActiveSupervisorDivisionIds`).
- Service filter builder & resolusi Divisi di `servers/services/approval-routing.service.ts` (`buildLeaveWhereForScope`, `buildOvertimeWhereForScope`, `buildLeaveWhereForViewer`, `buildOvertimeWhereForViewer`, `canReview`, `canView`).
- `LeaveService` dan `OvertimeService` mendukung query pending berdasarkan `ApprovalScope`, query viewer desktop, dan penghitungan badge antrean terarah.
- API mobile (`/api/leave/pending`, `/api/overtime/pending`) menyaring otomatis sesuai cakupan reviewer tanpa perubahan native mobile.
- Server action `reviewLeaveRequest` dan `reviewOvertime` memvalidasi kewenangan lewat `ApprovalRoutingService.canReview`, menolak akses silang divisi dengan pesan error tanpa mengubah data.
- Halaman desktop supervisor/manager (`/supervisor/izin`, `/supervisor/lembur`, `/manager/izin`, `/manager/lembur`) menampilkan data dan badge sesuai cakupan divisi masing-masing.
- 75 tests Vitest (termasuk 13 unit tests di `lib/approval-routing.test.ts` dan 10 tests di `servers/services/approval-routing.service.test.ts`), `check:unit` (Prisma format/validate, migrasi, ESLint, typecheck) hijau.
