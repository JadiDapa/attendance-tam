Status: ready-for-human
Repo: attendance-tam
Blocked by: 04

# 06 — Skrip sekali jalan: koreksi 47 absen pulang Sabtu 17:00 → 14:00

Spec: `../spec.md` (Skrip sekali jalan → Koreksi Sabtu). User story 58–59.

## Yang dibangun

Skrip TypeScript (dijalankan dengan `tsx`, memakai Prisma client yang sama)
yang mengoreksi absen pulang Sabtu hasil tombol "Otomatis 17:00" lama.

**Baris sasaran** — semua syarat harus terpenuhi: `CHECK_OUT`, `isManual`,
`createdByAdminId` null, `editedAt` null, tanggal kerja hari Sabtu, jam
tepat 17:00 WIB.

**Per baris:** `originalTimestamp` = jam lama; `timestamp` = Jam Pulang
Sabtu dari `WorkDay` (14:00 WIB); `editedById` = akun Administrator aktif
(dicari lewat email `admin@tarunagroup.co.id`, berhenti kalau tidak ada /
bukan ADMIN); `editedAt` = sekarang; `editNote` = "Koreksi sistem: jam pulang
otomatis Sabtu seharusnya 14:00".

**Pengaman:** bawaan dry-run (cetak tabel baris: id, userId, tanggal, jam lama
→ jam baru); tulis hanya dengan `--apply`; satu transaksi; idempoten (baris
yang sudah `editedAt` dilewati); cetak jumlah sebelum/sesudah; berhenti total
kalau Jam Pulang Sabtu di `WorkDay` bukan hari kerja.

## Kriteria selesai

- [x] Menjalankan `--apply` dua kali: kali kedua 0 baris.
- [x] Ada petunjuk singkat di header skrip: backup dulu, dry-run dulu.

## Langkah manusia

Alurnya dipandu `scripts/wizard-skrip-produksi.sh`.

- [ ] Dry-run ke salinan DB lokal (restore backup produksi) melaporkan
      **47 baris**; dua anomali (pulang 05:00 & 07:01) dan 12 baris 14:00
      **tidak** tersentuh.
- [ ] Setelah apply ke salinan, baris tampil berlabel "Diubah admin" di
      halaman kehadiran admin dengan jam asli terlihat.
- [ ] Backup produksi, lalu `--apply` ke produksi.

## Catatan

- Agent **tidak** menjalankan `--apply` ke produksi — itu langkah manusia.
- Jalankan setelah tiket 04 dirilis, supaya tidak muncul baris salah baru.

## Comments

**2026-11-19** — Diimplementasikan: `lib/saturday-correction.ts` (aturan sasaran
+ rencana, bebas Prisma), `servers/services/saturday-correction.service.ts`
(baca/tulis DB, satu transaksi), `scripts/koreksi-sabtu.ts` (CLI). Jalankan:
`npx tsx scripts/koreksi-sabtu.ts` (dry-run) lalu `… --apply`.

Pengaman tambahan dari pola "Skrip sekali jalan" di spec, di luar daftar tiket:
- cek `_prisma_migrations` memuat `20261118020000_division_position` — migrasi
  pertama sesudah commit tiket 04, jadi kode yang berjalan sudah tidak membuat
  baris 17:00 baru;
- berhenti kalau Jam Pulang Sabtu di `WorkDay` bukan 14:00 (bukan hanya kalau
  Sabtu libur), atau akun Administrator nonaktif;
- **baris konflik**: absen pulang 17:00 yang absen masuknya tidak sebelum 14:00
  akan jadi pulang sebelum masuk. Dry-run menampilkannya di tabel terpisah;
  `--apply` menolak jalan sampai baris itu dikoreksi lewat dialog Edit (lalu
  tidak lagi jadi sasaran karena `editedAt` terisi).

Terverifikasi: `npm run check` hijau. Integration test meniru produksi (47
sasaran, anomali 05:00 & 07:01, 12 baris 14:00, 17:00 hari Jumat → 47 terkoreksi,
sisanya utuh; apply kedua 0). Smoke test skrip di DB sementara: migrasi hilang →
berhenti, konflik → apply ditolak, sesudah Edit → apply 2, apply kedua 0.

**Belum (langkah manusia):** DB lokal kosong, tidak ada backup produksi yang
di-restore — jadi dry-run 47 baris ke salinan produksi dan cek label "Diubah
admin" di `/admin/kehadiran` belum dilakukan. Label berasal dari
`editedById !== null` (`lib/attendance.ts`), yang diisi skrip. Kalau dry-run
menampilkan konflik, jumlah sasaran = 47 − konflik. `--apply` ke produksi tetap
langkah manusia.

