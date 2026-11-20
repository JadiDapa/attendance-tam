Status: resolved
Repo: attendance-tam
Blocked by: —

# 09 — Divisi & Jabatan: skema + halaman graph Divisi (admin)

Spec: `../spec.md` (§2). ADR 0001. User story 11–21, 23–26.

## Yang dibangun

**Skema (migrasi aditif):**
- `Division` (`name` unik), `Position` (`name`, `divisionId` wajib; unik per
  (`divisionId`, `name`)), `User.positionId` nullable. Hapus Position
  dibatasi selama ada pemegang; hapus Division dibatasi selama ada Position.
- Divisi **tidak** disimpan di `User`.

**Lapisan server** (validator Zod → service → server action, pola yang ada):
- CRUD Divisi dan Jabatan, termasuk hapus yang ditolak kalau masih ada isi
  (pesan jelas).
- Set Jabatan seseorang langsung (tanpa approval) — boleh juga mengosongkan.
- **Sinkron `User.position`**: setiap kali `positionId` diubah atau nama
  Jabatan diubah, nama Jabatan disalin ke kolom teks semua pemegangnya
  (satu transaksi). `positionId` null → kolom teks dibiarkan.
- Semua aksi `requireRole(ADMIN)`.

**Halaman `/admin/divisi`** (desktop, khusus Role Admin, masuk sidebar admin):
- Pohon: Manager (user aktif ber-Role Manager) di puncak → tiap Divisi →
  Jabatan → orang. Supervisor Divisi (Role Supervisor aktif dengan Jabatan
  di Divisi itu) ditandai; Divisi tanpa Supervisor Divisi diberi peringatan.
- Kelompok "Belum punya Jabatan" berisi user aktif non-Manager tanpa Jabatan.
- Aksi: tambah/ubah nama/hapus Divisi & Jabatan, pindahkan orang ke Jabatan
  lain atau kosongkan.
- Hanya komponen shadcn yang sudah ada (Card, Collapsible/Accordion, Badge,
  Dialog, Select, dsb.) — **tanpa library graph baru**. Ikuti gaya halaman
  admin lain (PageHeader, dsb.).

## Kriteria selesai

- [ ] Non-admin yang membuka `/admin/divisi` diarahkan seperti halaman admin
      lain; aksi server menolak non-admin.
- [ ] Mengganti nama Jabatan memperbarui kolom teks jabatan semua pemegangnya.
- [ ] Hapus Divisi/Jabatan yang tidak kosong ditolak dengan pesan.
- [ ] Migrasi hanya menambah; aplikasi mobile 1.1.0 tidak terpengaruh
      (field `position` di respons API tetap string).
- [ ] `parity:capture --desktop` untuk halaman baru; halaman admin lain tidak
      berubah.
- [ ] lint + `tsc --noEmit` hijau.

## Comments

**2026-11-19 — status diperbarui saat audit** (implementasi: `f627c43`).
Migrasi `20261118020000_division_position` hanya menambah (FK `RESTRICT`);
`DivisionService` menyinkronkan `User.position` saat set/ganti nama Jabatan
dalam transaksi; hapus Divisi/Jabatan ditolak kalau masih berisi; semua aksi
`requireRole(ADMIN)`; `/admin/divisi` masuk sidebar admin. Integration test di
`servers/services/division.service.int.test.ts`. `npm run check` hijau.

Belum: `parity:capture --desktop` untuk `/admin/divisi`.
