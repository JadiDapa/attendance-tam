Status: resolved
Repo: attendance-tam
Blocked by: —

# 07 — Tutup request account publik + dialog Hubungi Admin (backend + web)

Spec: `../spec.md` (§1 Request account). User story 1–3, 6, 8–10.

## Yang dibangun

- Halaman request account web → `redirect("/login")`; komponen form-nya tidak
  lagi dipakai (hapus bila tidak dirujuk di tempat lain).
- Rute request account dikeluarkan dari daftar rute publik di proxy.
- Server action pembuat permintaan akun dihapus. Aksi **review** permintaan
  akun milik admin tetap ada.
- `POST /api/account-requests` → **410 Gone** dengan JSON
  `{ error: "Pendaftaran mandiri ditutup. Hubungi admin di admin@tarunagroup.co.id." }`
  (bentuk field mengikuti konvensi error API yang sudah dipakai mobile).
- Halaman login web: tautan "Ajukan pembuatan akun" diganti tombol yang membuka
  **dialog Hubungi Admin** (Dialog shadcn yang sudah ada), berisi:
  - email `admin@tarunagroup.co.id` (satu konstanta bersama);
  - tombol **Salin** (Clipboard API + toast sonner, tangani kegagalan
    clipboard dengan toast error);
  - tombol **Kirim email** → `mailto:` dengan `subject` + `body` ter-encode,
    template: Nama, Email, No. HP, Jabatan, Divisi.
- Berlaku untuk tree desktop **dan** tree mobile web (`md:hidden`) halaman
  login.
- Halaman admin permintaan akun dan datanya tidak berubah.

## Kriteria selesai

- [ ] Membuka `/request-account` (login maupun belum) berakhir di `/login`.
- [ ] `POST /api/account-requests` tanpa auth → 410 + pesan; tidak ada baris
      `AccountRequest` baru yang bisa dibuat dari luar.
- [ ] Dialog bisa dibuka dari login desktop dan login mobile web; salin dan
      mailto berfungsi.
- [ ] Loop parity: login mobile web dicek; `parity:capture --desktop` untuk
      login desktop.
- [ ] lint + `tsc --noEmit` hijau.

## Comments

**2026-11-19 — status diperbarui saat audit** (implementasi: `0f5d9f1`).
`/request-account` → `redirect("/login")` dan keluar dari rute publik
`proxy.ts`; `POST /api/account-requests` → 410 + `ACCOUNT_REQUEST_CLOSED_MESSAGE`;
aksi & form pembuat permintaan dihapus; `ContactAdminDialog` (teks di
`lib/contact-admin.ts`, diuji Vitest) di halaman login, yang satu layout untuk
desktop dan mobile web. `npm run check` hijau.

Belum: loop parity login mobile web dan `parity:capture --desktop`
(`MOBILE_PARITY.md` #4 mencatat "parity loop not yet run").
