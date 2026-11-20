# Attendance TAM

Sistem absensi karyawan Taruna Group: absen masuk/pulang, lembur, izin, dinas
luar, dan approval-nya.

## Language

### Jadwal kerja

**Hari Kerja**:
Satu hari dalam pola mingguan yang punya jam masuk, jam pulang, dan jam mulai
lembur sendiri. Setiap hari dalam seminggu bisa punya jam yang berbeda (mis.
Sabtu pulang lebih awal).
_Avoid_: jam kerja standar, shift

**Jam Pulang**:
Jam berakhirnya kerja normal pada satu Hari Kerja.
_Avoid_: jam keluar, 17:00 (sebagai angka tetap)

**Jam Mulai Lembur**:
Jam paling awal Lembur boleh dimulai pada satu Hari Kerja. Diatur admin per
Hari Kerja dan berdiri sendiri — mengubah Jam Pulang tidak ikut mengubahnya.
_Avoid_: jam lembur minimum, 18:00 (sebagai angka tetap)

### Organisasi

**Divisi**:
Unit kerja yang mengelompokkan beberapa Jabatan, mis. Divisi Admin dan Divisi
Teknis. Divisi seseorang selalu mengikuti Jabatannya.
_Avoid_: departemen, bagian, tim

**Jabatan**:
Posisi kerja seseorang yang selalu berada di bawah tepat satu Divisi, mis.
Teknisi, Admin, Supervisor Teknis.
_Avoid_: posisi, title

**Role**:
Hak akses seseorang di sistem (Karyawan, Supervisor, Manager, Admin). Berdiri
sendiri dari Divisi dan Jabatan — Role Admin bukan Divisi Admin, dan bukan
Jabatan Admin.
_Avoid_: level, hak

**Supervisor Divisi**:
Orang ber-Role Supervisor yang Jabatannya berada di sebuah Divisi. Satu Divisi
boleh punya lebih dari satu Supervisor Divisi; siapa pun dari mereka boleh
memutuskan Pengajuan anggota Divisinya.
_Avoid_: atasan, kepala divisi

**Manager**:
Orang ber-Role Manager. Berada di atas semua Divisi, tidak punya Jabatan
maupun Divisi, dan memutuskan Pengajuan para Supervisor Divisi.
_Avoid_: direktur, manajer divisi

### Approval

**Pengajuan**:
Sesuatu yang dibuat seseorang dan menunggu keputusan setuju/tolak: izin/sakit/
cuti, Lembur, absen di luar radius, atau dinas luar.
_Avoid_: request, permohonan, tiket

### Absensi

**Absen Pulang Terlewat**:
Hari yang punya absen masuk tetapi tidak punya absen pulang. Karyawan harus
mengonfirmasi Jam Pulang hari itu sebelum boleh absen masuk lagi.
_Avoid_: absensi menggantung, lupa absen

**Lembur**:
Kerja di luar jam kerja normal, dicatat sebagai sesi dengan jam mulai dan jam
selesai, dimulai paling awal pada Jam Mulai Lembur.
_Avoid_: overtime (di teks untuk pengguna)
