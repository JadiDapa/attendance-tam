# Aturan absensi & rekap

Cara kehadiran diterjemahkan jadi status rekap, approval absen luar radius,
penambahan/koreksi oleh admin, dan Absen Pulang Terlewat. Istilah mengikuti
`GLOSSARY.md`.

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
(tanggal, tujuan, biaya, dst.) oleh supervisor dan disetujui Manager — begitu
disetujui, karyawan yang ditugaskan tidak perlu absen sama sekali sepanjang
rentang tanggalnya. Approval Absensi adalah untuk kasus dadakan/tidak
direncanakan: karyawan tetap absen (foto + GPS) dari luar radius dan reviewer
menilai per kejadian.

Sakit/izin/cuti tidak bisa diklaim dari form absensi — jalurnya tetap pengajuan
`LeaveRequest` di `/izin`. Reviewer masih bisa menimpanya jadi salah satu itu saat
menyetujui.

Reviewer memutuskan di `/supervisor/verifikasi`, `/manager/verifikasi`, atau
`/admin/verifikasi` (siapa melihat absensi siapa: `docs/approval-routing.md`):
**setujui** (dengan mode apa pun dari `APPROVAL_MODES`, termasuk menimpa klaim karyawan lewat `approvedMode`) atau
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
dengan catatan bahwa reviewer belum memutuskan.

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
  jam asli di `originalStartAt`/`originalEndAt`. Batas Jam Mulai Lembur
  (`canStartOvertimeAt()`) sengaja tidak berlaku untuk koreksi admin. Jam selesai < jam mulai = melewati tengah malam.

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

**Absen Pulang Terlewat** (absen masuk ada, absen pulang tidak pernah tercatat)
tidak ditutup oleh cron. Hari itu terbaca lewat `isMissingCheckOut()` dan
`AttendanceService.listUnresolvedCheckouts()`. Saat karyawan hendak absen masuk lagi,
`submitAttendance` menolak sampai hari yang menggantung dikonfirmasi lewat
`confirmMissedCheckout()`: karyawan menekan **"Otomatis pukul <Jam Pulang>"** (jam pulang
diisi Jam Pulang Hari Kerja tanggal itu, mis. Sabtu 14:00 — `time` dikosongkan, server
memakai `autoCheckOutTimeFor()`) atau memilih jam sendiri. Jam apa pun harus sesudah jam
absen masuk (`missedCheckoutTimeError()`). UI-nya `MissedCheckoutDialog`
di web (dipasang di `SelfAttendanceDashboard`) dan `MissedCheckoutModal` di mobile.
Baris hasilnya `isManual` tanpa foto/GPS. Admin tetap bisa mencatat manual di
`/admin/kehadiran`.
