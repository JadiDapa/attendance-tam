Status: resolved
Repo: mobile-tam
Blocked by: 04

# 05 — Mobile: modal Absen Pulang Terlewat yang jelas & tervalidasi

Spec: `../spec.md` (§3). User story 52–56, 65.

## Yang dibangun

Modal Absen Pulang Terlewat di aplikasi mobile memakai data baru dari
`GET /api/attendance/missed` (tiket 04):

- judul menyebut hari + tanggal yang dikonfirmasi;
- menampilkan jam masuk hari itu;
- tombol "Otomatis pukul HH:mm" dengan Jam Pulang hari itu (bukan label
  tetap 17:00);
- validasi client: jam yang dipilih harus > jam masuk; pesan menyebut jam
  masuk; error dari server tetap ditampilkan apa adanya.
- Kalau field baru tidak ada (backend lama), modal jatuh ke perilaku lama
  tanpa crash.

## Kriteria selesai

- [ ] Tidak ada label otomatis 17:00 yang ditulis mati tersisa.
- [ ] Kasus Harry/Sopiah (pilih 05:00 / 07:01 setelah masuk ~08:00) ditolak
      sebelum terkirim.
- [ ] Hanya perubahan JavaScript (OTA ke runtime 1.1.0).
- [ ] lint + typecheck mobile hijau; dicek di simulator.

## Comments

**2026-11-19 — status diperbarui saat audit** (implementasi: mobile-tam `5f81c7f`,
lint dirapikan di `fbd405e`). Modal membaca `missedDays`: judul hari + tanggal,
jam masuk, tombol "Otomatis pukul HH:mm"; validasi client
`missedCheckoutTimeError()` menolak jam ≤ jam masuk; error server tampil apa
adanya; backend lama jatuh ke `days`.

Belum: cek di simulator.
