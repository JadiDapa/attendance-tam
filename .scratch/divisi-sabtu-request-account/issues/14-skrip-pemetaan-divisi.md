Status: ready-for-human
Repo: attendance-tam
Blocked by: 09

# 14 — Skrip sekali jalan: pemetaan Divisi & Jabatan awal

Spec: `../spec.md` (Skrip sekali jalan → Pemetaan Divisi). User story 61–63.

## Yang dibangun

Skrip TypeScript (`tsx`, Prisma client yang sama) yang membuat struktur awal
dan memetakan user, memakai jalur set-Jabatan tiket 09 (supaya kolom teks
jabatan ikut tersinkron).

**Struktur:**
- Divisi **Admin**: Jabatan *Supervisor Admin*, *Admin*.
- Divisi **Teknis**: Jabatan *Supervisor Teknis*, *Teknisi*, *Teknisi (EoS)*,
  *Programmer*.

**Pemetaan** (cocokkan **id + email** sekaligus, dari snapshot produksi):
- Sally Riski → Supervisor Admin (harus Role SUPERVISOR)
- Delima Ayu Anugrah, Nadhirah Meidiasty Maharani, Aulia Zatalini → Admin
- Sopiah Bimabia → Admin (Role ADMIN — memang begitu)
- Dwiky Wahyudi → Supervisor Teknis (harus Role SUPERVISOR)
- Semua user **aktif** dengan teks jabatan persis "Teknisi" → Teknisi
- Hery Arffan → Teknisi (EoS)
- Daffa Althaf Ridovani (`daffalthaf25@…`) → Programmer
- **Tidak dipetakan:** Administrator (2 akun), Karyawan Contoh (2 akun),
  `tes-dika-1`, Reza Maulana (Manager), akun nonaktif.

Daftar id/email **tidak** di-commit ke repo (data pribadi karyawan). Skrip
membaca file pemetaan lokal (CSV/JSON: `userId, email, jabatan`) yang
path-nya diberikan sebagai argumen; sertakan contoh format dengan data
rekaan, dan tambahkan pola nama file pemetaan asli ke `.gitignore`. Isi file
asli disusun dari snapshot `User` produksi sesuai daftar di atas.

**Pengaman:** bawaan dry-run (cetak tabel user → Jabatan → Divisi); tulis
hanya dengan `--apply`; satu transaksi; cek `_prisma_migrations` memuat
migrasi tiket 09; idempoten (Divisi/Jabatan dibuat kalau belum ada; user yang
sudah punya Jabatan yang sama dilewati, yang punya Jabatan **berbeda** →
berhenti); berhenti total kalau id/email tidak cocok atau Role tidak sesuai
dugaan.

## Kriteria selesai

- [x] `--apply` dua kali: kali kedua tidak mengubah apa pun.

## Langkah manusia

Alurnya dipandu `scripts/wizard-skrip-produksi.sh`.

- [ ] Dry-run ke salinan DB lokal (restore backup produksi) melaporkan
      pemetaan persis seperti di atas.
- [ ] Setelah apply ke salinan, `/admin/divisi` menampilkan pohon yang benar;
      tidak ada Divisi tanpa Supervisor; "Belum punya Jabatan" berisi akun yang
      memang tidak dipetakan.
- [ ] Backup produksi, lalu `--apply` ke produksi.

## Catatan

- Agent tidak menjalankan `--apply` ke produksi.
- Pola acuan: `scripts/koreksi-sabtu.ts` (tiket 06) — rencana bebas Prisma di
  `lib/`, service yang baca/tulis dalam satu transaksi, CLI tipis. Cek migrasi
  pakai `MigrationService.checkApplied()` (sudah menolak database kosong).
- Output dry-run cukup menampilkan nama + Jabatan; email hanya dipakai untuk
  pencocokan, tidak perlu dicetak.

## Comments

**2026-11-19** — Diimplementasikan: `lib/division-mapping.ts` (struktur,
baca file pemetaan, rencana — bebas Prisma),
`servers/services/division-mapping.service.ts` (baca/tulis DB, satu transaksi,
cek migrasi `20261118020000_division_position`), `scripts/pemetaan-divisi.ts`
(CLI). Jalankan: `npx tsx scripts/pemetaan-divisi.ts FILE` (dry-run) lalu
`… FILE --apply`. Contoh format rekaan: `scripts/pemetaan-divisi.example.csv`;
`pemetaan-divisi*.csv` / `pemetaan-divisi*.json` diabaikan git.

Keputusan implementasi:
- File pemetaan menyebut orang yang bernama di daftar (id + email). User aktif
  berteks jabatan persis "Teknisi" yang **tidak** disebut file otomatis jadi
  Teknisi; kalau disebut (mis. Hery → Teknisi (EoS)), file menang.
- Dugaan Role per Jabatan dikunci di `DIVISION_STRUCTURE`: Supervisor Admin /
  Supervisor Teknis → `SUPERVISOR`; Admin → `EMPLOYEE` atau `ADMIN` (Sopiah);
  Teknisi, Teknisi (EoS), Programmer → `EMPLOYEE`. Selain itu berhenti (juga
  untuk Manager & user hasil aturan teks "Teknisi").
- Berhenti juga kalau baris file dobel, Jabatan tidak dikenal, atau akun
  nonaktif disebut. Semua ketidakcocokan dilaporkan sekaligus.
- Dry-run mencetak nama → Jabatan → Divisi (tanpa email), yang dilewati, dan
  "Tetap tanpa Jabatan" (aktif, bukan Manager) untuk dicocokkan dengan daftar
  tidak dipetakan.
- `DivisionService.createDivision/createPosition/assignPosition` kini menerima
  transaksi pemanggil (opsional), supaya skrip memakai jalur set-Jabatan tiket
  09 (kolom teks ikut tersinkron) di satu transaksi.
- `scripts/wizard-skrip-produksi.sh` menanyakan path file pemetaan saat skrip
  ini dipilih dan meneruskannya ke setiap jalan skrip.

Terverifikasi: `npm run check` hijau. Integration test: dry-run tidak menulis;
apply membuat 2 Divisi + 6 Jabatan dan memetakan 8 user (teks jabatan
tersinkron; nonaktif, Administrator, Manager tidak tersentuh); apply kedua 0
perubahan (snapshot termasuk `updatedAt` identik); email salah / Role salah /
Jabatan berbeda → berhenti tanpa menulis. Smoke test CLI di DB sementara dengan
user rekaan: dry-run → apply (6 dipetakan) → apply kedua (0, 6 dilewati).

**Belum (langkah manusia):** file pemetaan asli belum disusun (butuh snapshot
`User` produksi); dry-run/apply ke salinan produksi dan cek `/admin/divisi`
belum dilakukan.

**2026-11-19 (review)** — Perbaikan hasil code review:
- **Aturan "Teknisi" berubah:** tidak ada lagi pemetaan otomatis dari teks
  jabatan. Setiap orang yang dipetakan harus disebut file (id + email),
  termasuk semua Teknisi. User aktif berteks jabatan persis "Teknisi" yang
  tidak ada di file → berhenti dengan pesan yang menyebut nama + id-nya
  (snapshot sudah usang). Contoh CSV, kepala skrip, dan
  `docs/approval-routing.md` diperbarui. File pemetaan asli nanti wajib
  memuat semua Teknisi.
- `DivisionMappingService.apply()` melempar error (bukan mengembalikan hasil)
  kalau sesudah apply masih ada struktur/pemetaan tersisa, jadi transaksi
  di-rollback. Integration test baru membuktikan tidak ada yang tertulis.
- Pesan error memakai nomor baris file asli (`Baris 5: …`, JSON: urutan objek);
  tanpa nomor baris ditulis `User <id>: …`, bukan `Baris <id>`.
- `DivisionService.createDivision/createPosition/assignPosition` sama-sama
  menerima `db?: Db`; `type Db` kini satu, diekspor `lib/prisma.ts`.
- `npm run check` hijau.
