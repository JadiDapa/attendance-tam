Status: resolved
Repo: attendance-tam
Blocked by: 01

# 04 — Absen Pulang Terlewat: jam otomatis ikut Jam Pulang + validasi (backend + web)

Spec: `../spec.md` (§3 Absen Pulang Terlewat). User story 52–57.

## Yang dibangun

- **Jam pulang otomatis** = Jam Pulang Hari Kerja untuk tanggal yang
  dikonfirmasi (Sabtu 14:00, hari biasa 17:00), menggantikan konstanta 17:00
  di server. Aturan bebas-Prisma di modul jadwal kerja.
- **Validasi**: jam pulang yang dipilih harus **> jam absen masuk** tanggal
  itu. Dicek di aksi konfirmasi (penentu). Pesan error menyebut jam masuk
  ("Jam pulang harus setelah jam masuk 08:02").
- **Data untuk dialog**: daftar hari terlewat disertai, per hari, label hari +
  tanggal, jam masuk, dan jam pulang otomatis — semua sudah diformat di server.
  Di `GET /api/attendance/missed` ini **ditambahkan** sebagai field baru;
  field `days` yang lama tetap ada dan tetap sama (mobile 1.1.0 memakainya).
- **Dialog web** (Absen Pulang Terlewat): judul menyebut hari
  ("Absen pulang hari Sabtu, 14 Nov"), menampilkan jam masuk, tombol
  "Otomatis pukul 14:00" dengan jam sebenarnya, validasi yang sama di client.
- **Dialog absen manual admin**: jam bawaan absen pulang = Jam Pulang Hari
  Kerja tanggal yang dipilih, bukan 17:00.

## Kriteria selesai

- [x] Test (Vitest): jam otomatis Sabtu → 14:00, Senin → 17:00, fallback saat
      `WorkDay` kosong; pulang 05:00 dengan masuk 08:00 ditolak, sama dengan
      jam masuk ditolak, 14:00 diterima.
- [x] Tidak ada lagi konstanta 17:00 untuk jam pulang otomatis di server dan
      dialog web.
- [x] Respons `GET /api/attendance/missed` tetap berisi `days` (kompatibel).
- [x] Mengirim jam pulang tidak sah lewat API (seperti mobile lama) ditolak
      server dengan pesan yang jelas.
- [x] Tree mobile web: dialog dicek lewat loop parity; desktop tidak berubah
      selain isi dialog.
- [x] lint + `tsc --noEmit` + `npm test` hijau.

## Comments

**2026-11-18** — Diimplementasikan di commit `5fdd62b` (`autoCheckOutTimeFor()`,
`missedCheckoutTimeError()`, `lib/missed-checkout.ts`, field `missedDays` di
`GET /api/attendance/missed`, `MissedCheckoutDialog`, default jam pulang di
`ManualAttendanceDialog`). Diverifikasi ulang: `tsc --noEmit` bersih, `npm test`
45/45, `npm run lint` 0 error.

Belum: loop parity tree mobile web. `MOBILE_PARITY.md` mencatat modal ini belum
di-port ke tree mobile, dan verifikasinya butuh baris absen masuk tanpa absen
pulang di DB dev untuk akun parity. Status dibiarkan sampai itu dicek.

**2026-11-18 (parity)** — Loop parity dijalankan dengan absen masuk uji Sabtu
14 Nov 08:02 (Jam Pulang Sabtu 14:00). Isi kedua sisi sama: "Absen pulang hari
Sabtu, 14 Nov", jam masuk 08:02, "Otomatis pukul 14:00".

`MissedCheckoutDialog` sekarang mobile-first (overlay hitam 50% tanpa blur,
kartu `rounded-2xl p-5 gap-4`, teks rata tengah, tombol utama di atas) dengan
`md:` mengembalikan gaya `DialogContent` shadcn. Dirakit dari `DialogPortal` +
`DialogOverlay` karena `DialogContent` tidak bisa mengatur overlay-nya.

| State | Diff awal | Diff akhir |
|---|---|---|
| default (`missed-checkout`) | 76.76% | 4.05% |
| Pilih jam sendiri (`missed-checkout-custom`) | — | 11.06% |

Sisa diff di luar dialog ini: halaman Beranda di belakang overlay (gap lama
Home 9.3%), font (Montserrat di web vs Nexa-Regular + bold sintetis di export
Expo web), dan `@expo/ui` `DateTimePicker` yang tidak dirender sama sekali di
export web — web tetap memakai `<input type="time">`.

Desktop 1440×900 dibandingkan dengan versi `HEAD`: state default 0 px berbeda;
state "Pilih jam sendiri" hanya teks tombol "Konfirmasi pulang" → "Konfirmasi
Pulang" (disamakan dengan mobile).

Catatan setup parity (belum dicatat di `MOBILE_PARITY.md`, sedang disunting
sesi lain):
- `../mobile-tam/.env.example` memakai publishable key instance Clerk lama
  (`clean-gecko-52`); export harus memakai key yang sama dengan dashboard
  `.env`, dan pakai `npx expo export -p web --clear` — tanpa `--clear` Metro
  memakai nilai `EXPO_PUBLIC_*` dari cache.
- API Next tidak mengirim header CORS (aplikasi native tidak butuh), jadi
  export Expo web di :8081 tidak bisa memanggil :3000. Solusinya proxy
  same-origin di :8081 (`/api/*` → :3000, sisanya → `serve` dist di :8082) dan
  export dengan `EXPO_PUBLIC_API_URL=http://localhost:8081`.
- Akun parity bawaan `save-auth.mjs` tidak ada di instance ini; dipakai akun uji
  Clerk `parity+clerk_test@example.com` (kredensial di `.env`:
  `PARITY_EMAIL`/`PARITY_PASSWORD`, jalankan skrip dengan `node --env-file=.env`).
