# Divisi & routing approval

Siapa melihat dan memutuskan sebuah Pengajuan (izin/sakit/cuti, Lembur, absen
luar radius, dinas luar). Istilah — Divisi, Jabatan, Role, Supervisor Divisi,
Manager, Pengajuan — mengikuti `GLOSSARY.md`. Alasannya:

- `docs/adr/0001-divisi-diturunkan-dari-jabatan.md` — Divisi dibaca lewat
  Jabatan (`User.positionId` → `Position.divisionId`), tidak disimpan di `User`;
  Role berdiri sendiri; Manager tanpa Jabatan maupun Divisi.
- `docs/adr/0002-routing-pengajuan-saat-review.md` — Pengajuan tidak menyimpan
  Divisi pemohon; antrean dihitung saat dibuka dari Jabatan pemohon hari ini.

## Aturan

Tahap awal per Role pemohon (`resolveInitialLeaveStage()` di `lib/leave.ts`,
`resolveInitialOvertime()` di `lib/overtime.ts`) tidak berubah oleh Divisi:
Divisi hanya menyaring **siapa** di tahap itu yang melihat Pengajuannya.

| Tahap | Reviewer | Melihat & memutuskan |
|---|---|---|
| SUPERVISOR | Supervisor Divisi D | pemohon Divisi D + pemohon tanpa Jabatan |
| SUPERVISOR | Supervisor tanpa Jabatan | semua |
| SUPERVISOR | Manager | pemohon yang Divisinya tidak punya Supervisor Divisi aktif |
| MANAGER | Manager | semua |

Pemohon tanpa Jabatan tetap di Supervisor (tidak naik ke Manager), supaya
tidak ada Pengajuan yang hilang dari antrean.

## Di mana aturannya hidup

- `lib/approval-routing.ts` — satu-satunya tempat keputusan di atas, bebas
  Prisma: `getApprovalScope()`, `canReviewRequest()`, `isTurnToReview()`,
  `canViewRequest()`. Uji di `lib/approval-routing.test.ts`.
- `servers/services/approval-routing.service.ts` — menerjemahkan cakupan jadi
  filter Prisma (`build{Leave,Overtime,Attendance}WhereForScope()`, semuanya
  lewat satu `buildWhereForScope()` dengan potongan filter per tahap; versi
  `ForViewer` untuk riwayat desktop) dan cek kewenangan
  (`ApprovalRoutingService.canReview{Leave,Overtime,Attendance}()`). Semua
  server action dan API review memanggilnya, jadi antrean, badge
  (`NotificationService`), dan "Setujui semua" memakai cakupan yang sama.
  Reviewer di luar cakupan ditolak dengan pesan error tanpa mengubah data.

## Absen luar radius

`Attendance` tidak punya kolom tahap: tahapnya diturunkan dari Role pemilik
(`resolveAttendanceReviewerRole()` / `ownerRolesForAttendanceReviewer()` di
`lib/attendance.ts`) — Karyawan & Admin di tahap SUPERVISOR, Supervisor di tahap
MANAGER. Cakupan Divisi ditumpuk di atasnya. Admin tetap boleh memutuskan
absensi siapa pun kecuali miliknya sendiri — aturan ini hanya ada di
`ApprovalRoutingService` (`getAttendanceScopeForReviewer()` memberi Admin
cakupan `admin` untuk antrean & "Setujui semua"; `canReviewAttendance()` untuk
keputusan satu per satu). Bukti:
`servers/services/attendance-routing.service.int.test.ts`.

## Dinas luar

Dinas luar selalu diajukan Supervisor dan disetujui **Manager**
(`reviewFieldAssignment()`, `requireRole(MANAGER)`); admin hanya memantau di
`/admin/dinas-luar`. Pemilih karyawan dan validasinya satu filter:
`FieldAssignmentService.listAssignableEmployees()` / `areAssignable()` —
Supervisor Divisi hanya bisa menugaskan anggota Divisinya. Beda dengan routing
di atas: karyawan **tanpa Jabatan** tidak muncul di pemilih Supervisor Divisi,
hanya di pemilih Supervisor tanpa Jabatan. Jabatan Supervisor yang tidak
ditemukan lagi (mis. dihapus setelah sesi dimuat) → gagal tertutup: tidak ada
karyawan yang bisa dipilih.

## Mengisi Jabatan awal

`scripts/pemetaan-divisi.ts` (aturan di `lib/division-mapping.ts`) membuat
Divisi & Jabatan awal lalu memetakan user dari file pemetaan lokal. Setiap
orang yang dipetakan harus disebut file (id + email); user aktif berteks
jabatan persis "Teknisi" yang tidak ada di file membuat skrip berhenti
(snapshot usang). Cara jalan dan syarat berhenti lainnya ada di kepala file
skrip itu. Untuk produksi, pakai
`scripts/wizard-skrip-produksi.sh`.
