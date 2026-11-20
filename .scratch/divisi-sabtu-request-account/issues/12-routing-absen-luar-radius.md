Status: resolved
Repo: attendance-tam
Blocked by: 11

# 12 — Routing per Divisi untuk approval absen luar radius

Spec: `../spec.md` (§2). ADR 0002. User story 29, 31–33, 38, 42.

## Yang dibangun

Menerapkan modul aturan routing (tiket 11) ke approval absen luar radius:

- Daftar pending absen luar radius di API mobile (`/api/attendance/pending`),
  halaman verifikasi desktop Supervisor/Manager, dan tab `/approval` web
  mobile — saat ini difilter berdasarkan Role pemilik absensi; tambahkan
  cakupan Divisi di atasnya (pemetaan Role pemilik → tahap tetap sama).
- Aksi review absensi menolak reviewer di luar cakupan.
- Badge notifikasi ikut cakupan yang sama.

## Kriteria selesai

- [x] Setelah Jabatan diisi (tiket 14), antrean 474 absen luar radius lama
      terbagi sendiri ke Supervisor Divisi tanpa migrasi data.
- [x] Supervisor tidak bisa memutuskan absensi Divisi lain lewat API.
- [x] Mobile 1.1.0 tidak perlu diubah.
- [x] lint + `tsc --noEmit` + `npm test` hijau.

## Comments

**2026-11-19** — Diimplementasikan:
- `buildAttendanceWhereForScope()` di `servers/services/approval-routing.service.ts`:
  tahap diturunkan dari Role pemilik (`ownerRolesForAttendanceReviewer`), cakupan
  Divisi (`ApprovalScope`) ditumpuk di atasnya. Tidak ada kolom baru di `Attendance`.
- `ApprovalRoutingService.canReviewAttendance()` — dipakai `reviewAttendance`
  (server action + `PATCH /api/attendance/[id]/review`): Supervisor di luar
  cakupan ditolak, Manager mengambil tahap SUPERVISOR untuk Divisi tanpa
  Supervisor Divisi aktif, Admin tetap semua kecuali absensinya sendiri.
- `AttendanceService.listPendingApprovalForScope` / `countPendingApprovalForScope`
  menggantikan versi `ForOwnerRoles`; dipakai `/api/attendance/pending`,
  `/supervisor/verifikasi`, `/manager/verifikasi`, dan badge `NotificationService`
  (badge tab `/approval` web mobile ikut dari situ).
- "Setujui semua" (`approveAllPending`) dibatasi ke cakupan yang sama.
- Bukti: `servers/services/attendance-routing.service.int.test.ts` (8 test, Postgres
  sungguhan). Kriteria "474 antrean lama terbagi sendiri" dibuktikan lewat simulasi
  di test itu (absensi pending dicatat sebelum Jabatan diisi, lalu terbagi setelah
  Jabatan diisi) — angka 474 di produksi tidak dicek. "Mobile 1.1.0 tidak perlu
  diubah" dibuktikan dari kontrak API yang tidak berubah (bentuk respons
  `/api/attendance/pending` dan endpoint review sama), bukan dengan menjalankan app.
- `npm run check` hijau (lint 0 error, typecheck, unit, integration).


**2026-11-19 (review)** — Perbaikan hasil code review, perilaku tidak berubah:
- `canReviewAttendance()` di `lib/attendance.ts` dihapus (cabang non-admin sudah
  mati dan buta Divisi). Aturan Admin kini hanya di `ApprovalRoutingService`:
  `canReviewAttendance()` (satu cek self-review) dan
  `getAttendanceScopeForReviewer()` yang memberi Admin cakupan `{ kind: "admin" }`.
  `ownerRolesForAttendanceReviewer()` tidak lagi punya cabang ADMIN.
- `approveAllPendingAttendance` selalu meneruskan cakupan eksplisit;
  `AttendanceService.approveAllPending({ scope })` kini wajib (`AttendanceScope`),
  tidak ada lagi "tanpa scope = admin".
- Tiga switch cakupan (`build{Leave,Overtime,Attendance}WhereForScope`) dirakit
  dari satu `buildWhereForScope()` dengan potongan filter per tahap. Bentuk
  filter izin/lembur identik (unit test lama hijau); filter absensi setara.
- `npm run check` hijau.
