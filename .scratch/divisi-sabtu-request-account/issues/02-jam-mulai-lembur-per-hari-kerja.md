Status: resolved
Repo: attendance-tam
Blocked by: 01

# 02 — Jam Mulai Lembur per Hari Kerja (backend + web)

Spec: `../spec.md` (§3 Jam Mulai Lembur). User story 44–49, 51.

## Yang dibangun

Setiap Hari Kerja punya **Jam Mulai Lembur** sendiri, menggantikan batas tetap
18:00 di server dan web.

- Migrasi aditif: kolom `WorkDay.overtimeStartTime` (`"HH:mm"`), diisi
  `checkOutTime` + 1 jam untuk setiap baris yang ada (produksi:
  Senin–Jumat 18:00, Sabtu 15:00, Minggu 18:00). Seed ikut mengisi kolom ini.
- Aturan bebas-Prisma di modul jadwal kerja: "boleh mulai Lembur pada jam X
  untuk Hari Kerja ini?" — menggantikan konstanta jam lembur tetap. Fallback
  jadwal bawaan (saat `WorkDay` kosong) juga punya Jam Mulai Lembur.
- Aksi mulai Lembur memakai aturan itu untuk Hari Kerja tanggal kerja hari
  ini; pesan error menyebut jamnya ("Lembur hari ini baru bisa dimulai pukul
  15:00").
- Menu Waktu Kerja (admin): kolom Jam Mulai Lembur per hari. Validator:
  format `HH:mm` dan ≥ Jam Pulang hari itu. Mengubah Jam Pulang **tidak**
  mengubah Jam Mulai Lembur.
- Form mulai Lembur di web (desktop dan tree mobile web) menampilkan dan
  memvalidasi Jam Mulai Lembur hari ini, bukan 18:00.
- `/api/settings` otomatis ikut mengirim kolom baru di `workDays` —
  pastikan, jangan ubah bentuk respons lain.

## Kriteria selesai

- [ ] Test (Vitest): Sabtu 15:00 boleh, Sabtu 14:30 ditolak, Senin 17:30
      ditolak, Senin 18:00 boleh; Jam Mulai Lembur < Jam Pulang ditolak
      validator.
- [ ] Tidak ada lagi konstanta jam lembur 18 di kode web/server.
- [ ] Migrasi hanya menambah kolom; aman dijalankan di DB produksi yang ada.
- [ ] Ringkasan jadwal di menu Waktu Kerja/halaman lain tidak rusak.
- [ ] Desktop tidak berubah selain kolom baru di Waktu Kerja (cek
      `parity:capture --desktop`).
- [ ] lint + `tsc --noEmit` + `npm test` hijau.

## Catatan

- Aturan "harus sudah absen pulang dulu sebelum mulai Lembur" tidak berubah.
- Koreksi Lembur oleh admin tetap tidak terikat aturan jam mulai.

## Comments

**2026-11-18 — implemented.** Kolom `WorkDay.overtimeStartTime` (`@default("18:00")`,
migrasi `20261118010000_work_day_overtime_start` mengisi Jam Pulang + 1 jam, dibatasi
23:59). Aturan `canStartOvertimeAt()` + `hasValidOvertimeStart()` di
`lib/work-schedule.ts` (Vitest). `MIN_OVERTIME_HOUR`/`isOvertimeStartAllowed` dihapus.
Waktu Kerja punya kolom "Lembur mulai"; form Lembur desktop & mobile web memakai
Jam Mulai Lembur hari ini dari server.

Belum diverifikasi: `parity:capture --desktop` (tidak ada `.env`/sesi Clerk di
checkout ini). Migrasi diuji ke DB Postgres sementara (Sabtu 14:00 → 15:00, tanpa drift).
Dokumentasi CLAUDE.md/MOBILE_PARITY menyusul di tiket 15; mobile-tam di tiket 03.
