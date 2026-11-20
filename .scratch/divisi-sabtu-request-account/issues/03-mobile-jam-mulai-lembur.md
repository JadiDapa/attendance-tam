Status: resolved
Repo: mobile-tam
Blocked by: 02

# 03 — Mobile: Jam Mulai Lembur dari `/api/settings`

Spec: `../spec.md` (§3). User story 49–50, 65.

## Yang dibangun

Drawer mulai Lembur di aplikasi mobile tidak lagi memakai konstanta jam tetap
18. Ia membaca **Jam Mulai Lembur hari ini** dari `workDays` di respons
`/api/settings` (query `settings` yang sudah ada), dengan fallback 18:00 kalau
kolom belum ada (backend lama).

- Validasi dan teks peringatan menyebut jam yang berlaku ("Jam mulai harus
  pukul 15:00 atau lebih larut").
- Hari Kerja ditentukan dari tanggal kerja hari ini di zona waktu aplikasi
  (Asia/Jakarta), konsisten dengan cara layar Beranda membaca jadwal hari ini.
- Tipe respons settings di lapisan query diperbarui (kolom opsional).

## Kriteria selesai

- [ ] Tidak ada konstanta jam lembur 18 tersisa di mobile, selain fallback
      yang diberi komentar.
- [ ] Sabtu: jam 15:00 diterima drawer; 14:30 menampilkan peringatan dengan
      jam 15:00.
- [ ] Senin: perilaku sama seperti sebelumnya (18:00).
- [ ] Hanya perubahan JavaScript — **tidak ada modul native baru** (harus bisa
      dikirim lewat `eas update` ke runtime 1.1.0).
- [ ] lint + typecheck mobile hijau; dicek di simulator.

## Comments

**2026-11-18 — implemented** (mobile-tam `b19aea0`). Aturan di `src/lib/overtime.ts`
(`overtimeStartTimeFor()`, `canStartOvertimeAt()`, `getWorkDayOfWeek()` — hari di
Asia/Jakarta lewat offset tetap UTC+7, sama dengan server; fallback 18:00 yang
dikomentari). `OvertimeStartDrawer` membaca `useSettingsQuery()` sendiri, jadi kedua
pemanggil (Beranda, tab Lembur) tidak berubah; selama settings dimuat drawer tidak
memblokir. `AttendanceSettings.workDays[].overtimeStartTime?` opsional.

Diverifikasi: `tsc` hijau; eslint file yang diubah hijau (`expo lint` repo 8 → 7
error, 7 sisanya sudah ada di file lain); kasus Sabtu 15:00/14:30, Senin 17:30/18:00,
backend lama → 18:00 diuji dengan skrip assert sementara (mobile belum punya test runner).
**Belum**: cek di simulator (tidak ada Xcode simctl / `.env` di mesin ini).

Catatan terbuka: jam yang dibandingkan & dikirim masih jam lokal perangkat
(`getHours()`, perilaku lama), sementara Hari Kerja dipilih di WIB — hanya beda
untuk perangkat di luar WIB. Beranda (`isCheckInClosed`) masih memakai hari lokal
perangkat.
