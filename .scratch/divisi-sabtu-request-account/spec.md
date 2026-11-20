Status: ready-for-agent

# Spec: Divisi & routing approval, Jam Mulai Lembur per Hari Kerja, penutupan request account

Berlaku untuk dua repo: `attendance-tam` (backend + web) dan `mobile-tam`
(aplikasi Expo yang memakai API `attendance-tam`). Kedua sistem sudah
produksi dengan data nyata. Istilah mengikuti `GLOSSARY.md`; keputusan
arsitektur di `docs/adr/0001-divisi-diturunkan-dari-jabatan.md` dan
`docs/adr/0002-routing-pengajuan-saat-review.md`.

## Tiket

| # | Tiket | Repo | Blocked by |
|---|---|---|---|
| 01 | [Pasang Vitest](issues/01-pasang-vitest.md) | attendance-tam | — |
| 02 | [Jam Mulai Lembur per Hari Kerja](issues/02-jam-mulai-lembur-per-hari-kerja.md) | attendance-tam | 01 |
| 03 | [Mobile: Jam Mulai Lembur](issues/03-mobile-jam-mulai-lembur.md) | mobile-tam | 02 |
| 04 | [Absen Pulang Terlewat](issues/04-absen-pulang-terlewat.md) | attendance-tam | 01 |
| 05 | [Mobile: Absen Pulang Terlewat](issues/05-mobile-absen-pulang-terlewat.md) | mobile-tam | 04 |
| 06 | [Skrip koreksi Sabtu](issues/06-skrip-koreksi-sabtu.md) | attendance-tam | 04 |
| 07 | [Tutup request account + Hubungi Admin](issues/07-tutup-request-account-web.md) | attendance-tam | — |
| 08 | [Mobile: Hubungi Admin](issues/08-mobile-hubungi-admin.md) | mobile-tam | 07 |
| 09 | [Divisi & Jabatan + halaman graph](issues/09-divisi-jabatan-halaman-graph.md) | attendance-tam | — |
| 10 | [Form pekerja: dropdown Jabatan](issues/10-form-pekerja-dropdown-jabatan.md) | attendance-tam | 09 |
| 11 | [Routing izin & Lembur per Divisi](issues/11-routing-izin-lembur-per-divisi.md) | attendance-tam | 01, 09 |
| 12 | [Routing absen luar radius](issues/12-routing-absen-luar-radius.md) | attendance-tam | 11 |
| 13 | [Dinas luar per Divisi](issues/13-dinas-luar-pilihan-per-divisi.md) | attendance-tam | 11 |
| 14 | [Skrip pemetaan Divisi](issues/14-skrip-pemetaan-divisi.md) | attendance-tam | 09 |
| 15 | [Perbarui dokumentasi](issues/15-perbarui-dokumentasi.md) | attendance-tam | 02, 04, 07, 09, 11 |

## Problem Statement

1. **Request account terbuka untuk publik.** Siapa pun bisa membuka form
   permintaan akun di web, di aplikasi mobile, atau memanggil endpoint-nya
   langsung. Ini membuka risiko bot/spam dan permintaan akun tanpa
   otorisasi, padahal akun karyawan seharusnya hanya dibuat Admin.

2. **Tidak ada Divisi.** Semua Supervisor melihat semua Pengajuan dari semua
   karyawan. Sally (Supervisor Admin) melihat izin teknisi, dan Dwiky
   (Supervisor Teknis) melihat izin staf admin. Antrean absen luar radius
   sudah menumpuk sampai 474 Pengajuan karena tidak jelas siapa yang
   bertanggung jawab. Perusahaan ingin: karyawan → Supervisor Divisi-nya
   sendiri, Supervisor → Manager. Selain itu, Role Admin, Divisi Admin, dan
   Jabatan Admin sering tercampur, padahal ketiganya hal yang berbeda.

3. **Sabtu dan Lembur salah.** Jam Pulang Sabtu adalah 14:00, tetapi:
   - tombol "Otomatis" untuk Absen Pulang Terlewat selalu mengisi 17:00
     untuk semua hari, sehingga 47 absen pulang Sabtu di produksi tercatat
     17:00;
   - Lembur hanya boleh dimulai pukul 18:00 untuk semua hari, sehingga kerja
     Sabtu antara 14:00 dan 18:00 tidak tercatat sebagai jam kerja maupun
     Lembur;
   - jam pulang yang dipilih sendiri tidak divalidasi, sehingga ada data
     pulang 05:00 dan 07:01, lebih awal dari jam masuk. Ini terjadi karena
     karyawan mengonfirmasi hari Sabtu pada Senin pagi dan mengira yang
     diminta adalah jam saat itu.

## Solution

1. Halaman dan endpoint request account ditutup. Di halaman login (web dan
   mobile) ada dialog **Hubungi Admin** dengan email resmi
   `admin@tarunagroup.co.id`, tombol salin (web), dan tombol kirim email
   dengan template permohonan.

2. Ada master data **Divisi** dan **Jabatan**. Setiap orang punya satu
   Jabatan, dan Divisi-nya mengikuti Jabatan itu. Pengajuan karyawan hanya
   terlihat oleh **Supervisor Divisi** pemohon. Pengajuan Supervisor naik ke
   **Manager**. Admin mengelola struktur ini lewat halaman graph Divisi
   (khusus Role Admin) dan form pekerja.

3. Setiap Hari Kerja punya **Jam Mulai Lembur** sendiri, yang diatur admin di
   menu Waktu Kerja. Nilai awalnya Jam Pulang + 1 jam: Senin–Jumat 18:00,
   Sabtu 15:00. Jam "Otomatis" Absen Pulang Terlewat mengikuti Jam Pulang
   hari itu. Jam pulang yang dipilih harus setelah jam masuk. 47 data Sabtu
   yang salah dikoreksi oleh skrip dengan jejak audit.

## User Stories

### Request account

1. Sebagai calon karyawan, saya ingin melihat siapa yang harus dihubungi di halaman login, supaya saya tahu cara mendapatkan akun.
2. Sebagai calon karyawan, saya ingin menyalin email admin dengan satu tombol di web, supaya saya tidak salah ketik.
3. Sebagai calon karyawan, saya ingin tombol yang membuka aplikasi email dengan subjek dan template isi (Nama, Email, No. HP, Jabatan, Divisi) sudah terisi, supaya permohonan saya lengkap.
4. Sebagai calon karyawan di aplikasi mobile, saya ingin dialog Hubungi Admin yang sama dari layar login dan layar welcome, supaya pengalaman web dan mobile sama.
5. Sebagai calon karyawan di aplikasi mobile, saya ingin bisa menyalin email admin dengan tekan lama, supaya saya tetap bisa menyalin tanpa tombol salin.
6. Sebagai pengunjung yang membuka alamat request account lama di web, saya ingin langsung diarahkan ke halaman login, supaya saya tidak melihat halaman rusak.
7. Sebagai pengguna aplikasi mobile yang membuka layar request account lama, saya ingin diarahkan ke login, supaya tidak ada jalan buntu.
8. Sebagai Admin, saya ingin endpoint permintaan akun publik menolak semua permintaan baru, supaya bot tidak bisa mendaftar lewat API secara langsung.
9. Sebagai pengguna aplikasi mobile versi lama yang masih mencoba mengirim permintaan akun, saya ingin pesan yang jelas untuk menghubungi admin, supaya saya tahu langkah berikutnya.
10. Sebagai Admin, saya ingin halaman daftar permintaan akun tetap bisa dibuka, supaya riwayat permintaan lama tetap terlihat.

### Divisi & Jabatan

11. Sebagai Admin, saya ingin membuat Divisi baru, supaya struktur organisasi tercermin di sistem.
12. Sebagai Admin, saya ingin mengubah nama Divisi, supaya nama tetap sesuai saat organisasi berubah.
13. Sebagai Admin, saya ingin menghapus Divisi hanya kalau sudah tidak punya Jabatan, supaya tidak ada orang yang kehilangan Divisi tanpa sengaja.
14. Sebagai Admin, saya ingin membuat Jabatan di bawah satu Divisi, supaya setiap Jabatan jelas Divisinya.
15. Sebagai Admin, saya ingin mengubah nama Jabatan, dan nama itu ikut berubah di profil semua pemegangnya, supaya tampilan tetap konsisten.
16. Sebagai Admin, saya ingin menghapus Jabatan hanya kalau tidak ada pemegangnya, supaya tidak ada orang yang tiba-tiba tanpa Jabatan.
17. Sebagai Admin, saya ingin melihat pohon Manager → Divisi → Jabatan → orang, supaya saya memahami struktur dalam sekali lihat.
18. Sebagai Admin, saya ingin Supervisor Divisi ditandai jelas di setiap Divisi pada pohon itu, supaya saya tahu siapa yang memutuskan Pengajuan Divisi tersebut.
19. Sebagai Admin, saya ingin peringatan pada Divisi yang tidak punya Supervisor Divisi, supaya saya tahu Pengajuan Divisi itu sedang naik ke Manager.
20. Sebagai Admin, saya ingin daftar orang yang "Belum punya Jabatan", supaya saya bisa melengkapinya.
21. Sebagai Admin, saya ingin memindahkan seseorang ke Jabatan lain langsung dari halaman graph, tanpa approval, supaya perubahan organisasi cepat diterapkan.
22. Sebagai Admin, saya ingin memilih Jabatan dari dropdown yang dikelompokkan per Divisi saat membuat atau mengubah pekerja, supaya tidak ada salah ketik.
23. Sebagai Admin, saya ingin Role tetap diatur terpisah dari Jabatan, supaya Role Admin, Divisi Admin, dan Jabatan Admin tidak tercampur.
24. Sebagai Admin, saya ingin halaman graph Divisi hanya bisa dibuka oleh Role Admin, supaya struktur organisasi tidak diubah orang lain.
25. Sebagai Manager, saya ingin tampil di puncak pohon tanpa Divisi, supaya terlihat bahwa saya membawahi semua Divisi.
26. Sebagai pengguna aplikasi mobile versi lama, saya ingin nama jabatan saya tetap tampil benar, supaya profil saya tidak kosong walaupun aplikasi belum diupdate.

### Routing Pengajuan

27. Sebagai karyawan, saya ingin izin/sakit/cuti saya diputuskan oleh Supervisor Divisi saya, supaya orang yang mengenal pekerjaan saya yang menilai.
28. Sebagai karyawan, saya ingin Lembur saya diputuskan oleh Supervisor Divisi saya, untuk alasan yang sama.
29. Sebagai karyawan, saya ingin absen luar radius saya diputuskan oleh Supervisor Divisi saya, untuk alasan yang sama.
30. Sebagai karyawan ber-Role Admin (misalnya staf Divisi Admin), saya ingin Pengajuan saya ke Supervisor Divisi saya, supaya Role saya tidak mengubah alur approval.
31. Sebagai Supervisor Divisi, saya ingin hanya melihat Pengajuan anggota Divisi saya, supaya antrean saya relevan dan bisa saya selesaikan.
32. Sebagai Supervisor Divisi, saya ingin badge jumlah Pengajuan di sidebar hanya menghitung Divisi saya, supaya angkanya sesuai dengan daftar.
33. Sebagai Supervisor Divisi di aplikasi mobile, saya ingin tab Review juga hanya menampilkan Divisi saya, tanpa harus mengupdate aplikasi.
34. Sebagai Supervisor, saya ingin Pengajuan saya sendiri diputuskan Manager, supaya saya tidak menyetujui Pengajuan saya sendiri.
35. Sebagai Manager, saya ingin Pengajuan saya tetap disetujui otomatis, sama seperti sekarang.
36. Sebagai Manager, saya ingin melihat Pengajuan dari Divisi yang tidak punya Supervisor Divisi, supaya Pengajuan itu tidak terlantar.
37. Sebagai Supervisor, saya ingin Pengajuan dari orang yang belum punya Jabatan tetap terlihat oleh semua Supervisor, supaya tidak ada Pengajuan yang hilang selama masa transisi.
38. Sebagai Supervisor Divisi, saya ingin 474 Pengajuan absen luar radius yang lama langsung terbagi ke Divisi masing-masing setelah Jabatan diisi, tanpa langkah tambahan.
39. Sebagai Supervisor Divisi, saya ingin Pengajuan pending seseorang yang pindah Divisi ikut pindah ke Supervisor Divisi barunya, supaya yang memutuskan adalah atasan saat ini.
40. Sebagai Supervisor, saya ingin hanya bisa menugaskan Dinas luar ke anggota Divisi saya, supaya penugasan sesuai tanggung jawab saya.
41. Sebagai Manager, saya ingin tetap memutuskan semua Dinas luar, sama seperti sekarang.
42. Sebagai Supervisor yang mencoba memutuskan Pengajuan dari Divisi lain secara langsung (misalnya lewat API), saya ingin ditolak, supaya batas Divisi tidak bisa dilewati.
43. Sebagai Admin yang melihat riwayat approval, saya ingin keputusan lama tetap tercatat apa adanya, supaya jejak audit tidak berubah karena Divisi baru.

### Jam Mulai Lembur & Hari Kerja

44. Sebagai Admin, saya ingin mengatur Jam Mulai Lembur untuk setiap Hari Kerja di menu Waktu Kerja, supaya aturan lembur Sabtu bisa berbeda dari hari biasa.
45. Sebagai Admin, saya ingin Jam Mulai Lembur awalnya terisi Jam Pulang + 1 jam, supaya perilaku Senin–Jumat (18:00) tidak berubah setelah rilis.
46. Sebagai Admin, saya ingin perubahan Jam Pulang tidak otomatis mengubah Jam Mulai Lembur, supaya keduanya bisa diatur terpisah.
47. Sebagai Admin, saya ingin validasi bahwa Jam Mulai Lembur tidak lebih awal dari Jam Pulang di hari itu, supaya Lembur tidak tumpang tindih dengan jam kerja normal.
48. Sebagai karyawan, saya ingin bisa memulai Lembur Sabtu mulai pukul 15:00, supaya kerja tambahan setelah jam pulang Sabtu tercatat.
49. Sebagai karyawan, saya ingin form Lembur (web dan mobile) menampilkan Jam Mulai Lembur hari ini, bukan selalu 18:00, supaya saya tahu batas yang berlaku.
50. Sebagai karyawan di aplikasi mobile, saya ingin batas jam Lembur diambil dari server, supaya web dan mobile selalu sama.
51. Sebagai karyawan, saya ingin server menolak Lembur yang dimulai sebelum Jam Mulai Lembur hari itu, dengan pesan yang menyebut jamnya.

### Absen Pulang Terlewat

52. Sebagai karyawan, saya ingin tombol "Otomatis" memakai Jam Pulang hari yang dikonfirmasi (Sabtu 14:00, hari biasa 17:00), supaya data saya benar.
53. Sebagai karyawan, saya ingin tombol "Otomatis" menampilkan jam sebenarnya ("Otomatis pukul 14:00"), supaya saya tahu apa yang akan tercatat.
54. Sebagai karyawan, saya ingin dialog menyebut hari yang dikonfirmasi dengan jelas ("Absen pulang hari Sabtu, 14 Nov"), supaya saya tidak mengira yang diminta jam saat ini.
55. Sebagai karyawan, saya ingin dialog menampilkan jam masuk saya di hari itu, supaya saya punya acuan.
56. Sebagai karyawan, saya ingin jam pulang yang ≤ jam masuk ditolak dengan pesan yang menyebut jam masuk saya, supaya kesalahan tidak tersimpan.
57. Sebagai karyawan dengan aplikasi mobile versi lama, saya ingin server tetap menolak jam pulang yang tidak masuk akal, supaya data tetap benar walaupun aplikasi belum diupdate.
58. Sebagai Admin, saya ingin 47 absen pulang Sabtu yang tercatat 17:00 dikoreksi menjadi 14:00 dengan label "Diubah admin" dan jam aslinya tersimpan, supaya rekap benar dan jejaknya tetap ada.
59. Sebagai Admin, saya ingin melihat daftar baris yang akan dikoreksi sebelum skrip benar-benar mengubah data, supaya saya bisa memeriksanya dulu.
60. Sebagai Admin, saya ingin dua absen pulang anomali (pulang 05:00 dan 07:01) dikoreksi sendiri lewat dialog Edit yang sudah ada, karena jam yang benar hanya diketahui dari karyawannya.

### Pemetaan awal & rilis

61. Sebagai Admin, saya ingin skrip yang mengisi Divisi dan Jabatan awal untuk semua orang sesuai data saat ini, supaya saya tidak perlu mengisi satu per satu.
62. Sebagai Admin, saya ingin skrip itu berhenti kalau data produksi tidak cocok dengan yang diharapkan, supaya tidak ada pemetaan yang salah.
63. Sebagai Admin, saya ingin skrip aman dijalankan dua kali, supaya kesalahan operasional tidak merusak data.
64. Sebagai karyawan dengan aplikasi mobile versi lama, saya ingin semua fitur yang ada tetap berjalan setelah backend dirilis, supaya pekerjaan saya tidak terganggu.
65. Sebagai karyawan, saya ingin perbaikan mobile datang lewat update otomatis (OTA), tanpa memasang APK baru.

## Implementation Decisions

### Umum

- Kerja di branch baru di kedua repo. Semua migrasi Prisma **hanya menambah**
  (tabel baru, kolom nullable atau kolom dengan nilai default). Tidak ada
  rename atau drop. Produksi sudah sampai migrasi terakhir repo
  (`20260919010000_admin_attendance_edit`).
- Arsitektur tetap: Server Action → validator (Zod) → service (Prisma).
  Aturan domain baru diletakkan di modul **bebas Prisma**, mengikuti pola
  modul jadwal kerja, hari libur, dan work-mode.
- Urutan rilis: backend dulu (tetap kompatibel dengan mobile 1.1.0), lalu
  mobile lewat `eas update` (OTA). **Tidak ada modul native baru** di
  mobile, karena `runtimeVersion` memakai policy `appVersion`.

### 1. Request account

- Halaman request account di web langsung `redirect("/login")`. Rutenya
  dikeluarkan dari daftar rute publik di proxy.
- Server action untuk membuat permintaan akun dihapus.
- `POST /api/account-requests` membalas **410 Gone** dengan pesan JSON yang
  meminta pengguna menghubungi admin. Alasannya: mobile 1.1.0 masih
  memanggil endpoint ini, dan 410 + pesan bisa ditampilkan apa adanya.
- Model `AccountRequest`, halaman admin permintaan akun, dan aksi review
  untuk Pengajuan lama tetap ada.
- Dialog **Hubungi Admin** di web (komponen Dialog shadcn yang sudah ada)
  berisi email admin, tombol salin (Clipboard API browser + toast sonner),
  dan tombol `mailto:` dengan `subject` dan `body` ter-encode berisi template
  Nama / Email / No. HP / Jabatan / Divisi. Email admin didefinisikan
  sebagai satu konstanta bersama.
- Mobile: tautan request account di layar login dan welcome diganti dialog
  dengan konten yang sama. Email ditampilkan sebagai teks yang bisa dipilih
  (tanpa tombol salin, karena tidak ada modul clipboard), ditambah tombol
  "Kirim email" lewat `Linking.openURL(mailto:…)`. Layar request account
  lama diarahkan ke login.

### 2. Divisi, Jabatan, routing

- **Skema baru:**
  - `Division`: `id`, `name` (unik), timestamps.
  - `Position`: `id`, `name`, `divisionId` (wajib), timestamps; unik per
    (`divisionId`, `name`).
  - `User.positionId`: nullable, relasi ke `Position`. Hapus Position
    dibatasi (restrict) selama masih ada pemegangnya.
- **Divisi tidak disimpan di `User`.** Divisi dibaca lewat Jabatan (ADR 0001).
- **`User.position` (teks) tetap ada.** Setiap kali `positionId` diubah, atau
  nama Jabatan diubah, nama Jabatan disalin ke kolom teks ini untuk semua
  pemegangnya. Kalau `positionId` null, kolom teks dibiarkan apa adanya
  (misalnya "Business Development Manager" milik Manager).
- **Supervisor Divisi** = user aktif dengan Role `SUPERVISOR` yang Jabatannya
  berada di Divisi itu. Tidak ada kolom `supervisorId`.
- **Manager** tidak punya Jabatan maupun Divisi, dan tampil di puncak pohon
  karena Role-nya.
- **Modul aturan routing (bebas Prisma).** Modul ini menerima reviewer (Role,
  Divisi), pemohon (Role, Divisi atau null), dan himpunan Divisi yang
  punya Supervisor Divisi aktif. Modul ini menjawab apakah reviewer berhak
  melihat dan memutuskan Pengajuan itu. Modul yang sama juga menghasilkan
  deskripsi cakupan antrean yang diterjemahkan service menjadi filter
  Prisma. Aturannya:
  - Tahap SUPERVISOR, reviewer Supervisor dengan Divisi D → pemohon di
    Divisi D, **atau** pemohon tanpa Jabatan.
  - Tahap SUPERVISOR, reviewer Supervisor tanpa Jabatan → semua (perilaku
    lama; jaring pengaman transisi).
  - Tahap SUPERVISOR, reviewer Manager → hanya pemohon yang Divisinya tidak
    punya Supervisor Divisi aktif.
  - Tahap MANAGER → semua Manager (perilaku lama).
  - Stage awal per Role pemohon **tidak berubah** (Karyawan/Admin →
    SUPERVISOR, Supervisor → MANAGER, Manager → disetujui otomatis).
- **Routing dihitung saat review** (ADR 0002). Tidak ada kolom Divisi di
  `LeaveRequest`, `Overtime`, atau `Attendance`.
- Cakupan ini dipakai di semua titik yang membaca atau memutuskan Pengajuan:
  daftar pending (API mobile dan halaman desktop Supervisor/Manager), tab
  Review di web mobile, riwayat Review bila relevan, badge notifikasi, dan
  **aksi review** (aksi review menolak reviewer di luar cakupan, tidak hanya
  menyembunyikannya dari daftar).
- **Dinas luar:** daftar karyawan yang bisa dipilih Supervisor (API dan form
  web) dibatasi ke Divisi Supervisor itu. Supervisor tanpa Jabatan melihat
  semua, seperti sekarang. Approval tetap oleh Manager.
- **Halaman graph Divisi** (khusus Role Admin, desktop web):
  - pohon Manager → Divisi (dengan penanda Supervisor Divisi dan peringatan
    "tanpa supervisor") → Jabatan → orang, plus kelompok "Belum punya
    Jabatan";
  - CRUD Divisi dan Jabatan (hapus hanya kalau kosong);
  - pindah Jabatan seseorang secara langsung.

  Dibangun dari komponen shadcn yang sudah ada, tanpa library graph baru.
  Masuk ke sidebar admin. Halaman ini tidak punya padanan di aplikasi
  mobile.
- **Form pekerja** (buat/ubah): kolom jabatan teks bebas diganti dropdown
  Jabatan yang dikelompokkan per Divisi (boleh kosong). Kolom teks lama
  diisi otomatis.
- **Mobile tidak perlu diubah untuk Divisi.** Semua filter dijalankan di
  server.

### 3. Jam Mulai Lembur & Absen Pulang Terlewat

- **Skema:** `WorkDay.overtimeStartTime` (`"HH:mm"`). Migrasi mengisi setiap
  baris dengan `checkOutTime` + 1 jam. Di produksi hasilnya Senin–Jumat
  18:00, Sabtu 15:00, Minggu 18:00. Setelah itu nilainya berdiri sendiri
  (tidak ikut berubah saat Jam Pulang diubah).
- Konstanta jam lembur tetap 18 dihapus dari web dan mobile. Aturan "boleh
  mulai Lembur" menjadi fungsi bebas Prisma di modul jadwal kerja: jam mulai
  ≥ Jam Mulai Lembur Hari Kerja tanggal itu. Pesan error menyebut jamnya.
- Validator menu Waktu Kerja: Jam Mulai Lembur wajib `HH:mm` dan
  ≥ Jam Pulang hari itu. Form Waktu Kerja menampilkan kolom ini per hari.
- `/api/settings` sudah mengirim `workDays`, jadi kolom baru ikut terkirim ke
  mobile. Mobile membaca Jam Mulai Lembur hari ini dari sana, dengan fallback
  18:00 kalau kolomnya tidak ada.
- **Jam pulang otomatis** = Jam Pulang Hari Kerja untuk tanggal yang
  dikonfirmasi. Menggantikan konstanta 17:00 di server, dialog web, dan
  modal mobile. Kalau tabel `WorkDay` kosong, dipakai fallback jadwal bawaan
  yang sudah ada.
- **Validasi Absen Pulang Terlewat:** jam pulang harus > jam absen masuk
  tanggal itu. Dicek di server (menentukan), dialog web, dan modal mobile.
  Pesan error menyebut jam masuk. Dialog menampilkan nama hari + tanggal,
  jam masuk, dan jam otomatis yang sebenarnya. Data yang dibutuhkan dialog
  (jam masuk, jam pulang otomatis) disertakan dari server bersama daftar
  hari yang terlewat, supaya format tanggal/jam tetap di server.
- Dialog absen manual admin memakai Jam Pulang Hari Kerja sebagai jam
  bawaan, tidak lagi 17:00.

### Skrip sekali jalan

Kedua skrip memakai pola keamanan yang sama:
- bawaannya dry-run, perubahan baru ditulis dengan `--apply`;
- semua perubahan dalam satu transaksi;
- sebelum jalan, cek `_prisma_migrations` sudah memuat migrasi baru;
- idempoten;
- mencetak ringkasan sebelum dan sesudah;
- berhenti total kalau ada ketidakcocokan.

**Koreksi Sabtu.** Menyentuh hanya baris yang memenuhi semua syarat: tipe
`CHECK_OUT`, `isManual`, `createdByAdminId` null, `editedAt` null, hari
Sabtu, dan jamnya tepat 17:00 WIB. Untuk setiap baris: `originalTimestamp`
diisi jam lama, `timestamp` diubah ke Jam Pulang Sabtu (14:00 WIB),
`editedById` diisi akun Administrator aktif, `editedAt` diisi waktu
sekarang, dan `editNote` diisi "Koreksi sistem: jam pulang otomatis Sabtu
seharusnya 14:00". Hasil yang diharapkan saat ini: **47 baris**.

**Pemetaan Divisi.**
- Membuat Divisi **Admin** (Jabatan: Supervisor Admin, Admin) dan **Teknis**
  (Jabatan: Supervisor Teknis, Teknisi, Teknisi (EoS), Programmer).
- Memetakan user berdasarkan **id + email** sekaligus:
  - Sally → Supervisor Admin;
  - Delima, Nadhirah, Aulia, Sopiah → Admin;
  - Dwiky → Supervisor Teknis;
  - semua user aktif berjabatan "Teknisi" → Teknisi;
  - Hery → Teknisi (EoS);
  - Daffa → Programmer.
- Tanpa Jabatan: Administrator (2 akun), Karyawan Contoh (2 akun),
  `tes-dika-1`, Reza (Manager), dan akun nonaktif.
- Berhenti kalau ada id/email yang tidak cocok atau Role yang tidak
  sesuai dugaan (misalnya Sally bukan `SUPERVISOR`).

## Testing Decisions

- **Seam utama:** modul aturan domain bebas Prisma, diuji lewat input →
  output saja, tanpa DB, tanpa Clerk, dan tanpa memeriksa detail
  implementasi. Test yang baik membaca seperti aturan bisnis ("Supervisor
  Admin tidak melihat izin Teknisi"), bukan seperti pemanggilan fungsi
  internal.
- **Test runner:** Vitest, ditambahkan sebagai devDependency di
  `attendance-tam` (tidak ikut build produksi), dengan script `npm test`.
  mobile-tam tidak mendapat test runner.
- **Modul yang diuji:**
  - Jam Mulai Lembur: Sabtu 15:00 boleh, Sabtu 14:30 ditolak, Senin 17:30
    ditolak, Senin 18:00 boleh.
  - Jam pulang otomatis: Sabtu → 14:00, Senin → 17:00, fallback saat
    `WorkDay` kosong.
  - Validasi Absen Pulang Terlewat: pulang 05:00 dengan masuk 08:00
    ditolak, sama dengan jam masuk ditolak, 14:00 diterima.
  - Validasi Waktu Kerja: Jam Mulai Lembur < Jam Pulang ditolak.
  - Routing Pengajuan, satu kasus per aturan:
    - Divisi sama → terlihat;
    - Divisi lain → tidak;
    - pemohon tanpa Jabatan → terlihat semua Supervisor;
    - Supervisor tanpa Jabatan → melihat semua;
    - Divisi tanpa Supervisor Divisi aktif → terlihat Manager, tidak
      terlihat Supervisor lain;
    - pemohon Supervisor → tahap Manager;
    - Supervisor nonaktif tidak dihitung sebagai Supervisor Divisi.
- **Prior art:** belum ada test di repo. Pola modulnya mengikuti modul
  jadwal kerja/hari libur/work-mode yang sudah bebas Prisma, dan fixture
  diambil dari data produksi nyata (jadwal `WorkDay`, kasus Harry/Sopiah).
- **Seam kedua (manual):** kedua skrip dijalankan dry-run ke salinan DB
  lokal hasil restore backup produksi. Koreksi Sabtu harus melaporkan 47
  baris, dan pemetaan harus melaporkan Jabatan per user sesuai daftar di
  atas.
- **Verifikasi UI (manual):** loop parity CLAUDE.md (`parity:compare`,
  `parity:capture --desktop`) untuk dialog Hubungi Admin di login mobile web
  dan desktop. Halaman graph Divisi dan menu Waktu Kerja dicek di desktop.
  Perubahan mobile-tam dicek di simulator. `npm run lint` dan
  `tsc --noEmit` hijau di setiap langkah.

## Out of Scope

- Mutasi Jabatan dengan approval bertingkat (sempat dirancang lalu dibatalkan;
  Admin mengubah Jabatan langsung).
- Filter atau pengelompokan per Divisi di laporan, rekap, dan ekspor.
- Menyelesaikan antrean 474 absen luar radius, atau mengubah aturan absen
  luar radius untuk teknisi lapangan.
- Koreksi data Lembur lama, termasuk Lembur Sabtu yang sudah disetujui dan
  jam pulang larut yang mungkin sebenarnya Lembur.
- Koreksi otomatis dua absen pulang anomali (dikerjakan Admin manual).
- Tombol salin email di aplikasi mobile (butuh modul native dan APK baru).
- Halaman graph Divisi di aplikasi mobile.
- Mengubah Role lewat approval (tetap langsung oleh Admin).
- Menjalankan skrip ke produksi dan deploy. Keduanya keputusan pemilik
  sistem, setelah backup.

## Further Notes

- **Keputusan turunan** (tidak ditanyakan eksplisit, konsisten dengan
  semangat "tidak ada Pengajuan yang hilang"): Supervisor yang belum punya
  Jabatan tetap melihat semua Pengajuan tahap SUPERVISOR, dan saat membuat
  Dinas luar tetap bisa memilih semua karyawan.
- CLAUDE.md diperbarui bersamaan:
  - Dinas luar disetujui **Manager**, bukan admin (berubah sejak 15 Sep
    2026);
  - grup rute `(employee)` memakai `requireUser()`;
  - ditambah bagian Divisi/Jabatan/routing dan Jam Mulai Lembur.
- Data produksi yang dipakai saat menyusun spec ini (snapshot 18 Nov 2026):
  - Hari Kerja Senin–Jumat 08:00–17:00, Sabtu 08:00–14:00, Minggu libur;
  - 47 absen pulang Sabtu otomatis tercatat 17:00 dan 12 tercatat 14:00;
  - 3 Lembur Sabtu;
  - Pengajuan pending: 4 izin, 474 absen luar radius, 0 Lembur, 0 Dinas
    luar, 0 permintaan akun.
- Password DB produksi sempat tertulis di percakapan saat menyusun spec ini.
  Disarankan diganti.

## Perubahan setelah rilis (20 Nov 2026)

- **Jam Mulai Lembur Sabtu = Jam Pulang Sabtu (14:00)**, bukan Jam Pulang +
  1 jam (15:00) seperti di keputusan 3 dan story 48. Senin–Jumat tetap 18:00.
  Kode tidak berubah (validasi Waktu Kerja sudah menerima Jam Mulai Lembur =
  Jam Pulang); nilainya diubah lewat migrasi data
  `20261120010000_saturday_overtime_at_check_out`, yang hanya menyentuh Sabtu
  yang masih memakai nilai awal supaya pilihan admin tidak tertimpa.
