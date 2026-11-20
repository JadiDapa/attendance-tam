# Divisi diturunkan dari Jabatan, Role berdiri sendiri

Seseorang punya satu Jabatan, dan Jabatan selalu milik tepat satu Divisi, jadi
Divisi orang itu **tidak disimpan** di `User` — dibaca lewat Jabatannya. Role
(Karyawan/Supervisor/Manager/Admin) tetap hak akses sistem dan tidak terikat
Divisi: Role Admin ≠ Divisi Admin ≠ Jabatan Admin. "Supervisor Divisi X"
didefinisikan sebagai Role Supervisor + Jabatan di Divisi X, bukan kolom
`supervisorId` di Divisi, sehingga satu Divisi boleh punya lebih dari satu
Supervisor Divisi. Manager berada di atas semua Divisi dan sengaja tidak punya
Jabatan maupun Divisi — Divisi "Manajemen" sempat dipertimbangkan tapi tidak
punya Supervisor Divisi, jadi hanya menambah kerumitan tanpa mengubah hasil.

## Consequences

- Kolom lama `User.position` (teks bebas) dipertahankan dan selalu disalin dari
  nama Jabatan, karena aplikasi mobile versi lama membacanya sebagai string.
- Pindah Jabatan dilakukan langsung oleh Admin, tanpa approval. Sistem Mutasi
  Jabatan bertingkat (Supervisor → Manager) sempat dirancang lalu dibatalkan.
- Orang tanpa Jabatan (akun sistem/uji coba) tidak punya Divisi; Pengajuannya
  terlihat oleh semua Supervisor seperti sebelum ada Divisi.
