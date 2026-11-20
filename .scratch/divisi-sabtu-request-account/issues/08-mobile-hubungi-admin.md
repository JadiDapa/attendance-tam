Status: ready-for-human
Repo: mobile-tam
Blocked by: 07

# 08 — Mobile: dialog Hubungi Admin, tutup layar request account

Spec: `../spec.md` (§1). User story 4–5, 7, 9, 65.

## Yang dibangun

- Tautan ke layar request account di layar **login** dan **welcome** diganti
  tombol yang membuka dialog Hubungi Admin (pola modal yang sudah dipakai
  aplikasi), berisi:
  - email `admin@tarunagroup.co.id` sebagai teks yang bisa dipilih/disalin
    dengan tekan lama;
  - tombol "Kirim email" → `Linking.openURL("mailto:…")` dengan subjek +
    template yang sama seperti web (tiket 07).
  - **Tanpa** tombol salin (tidak ada modul clipboard; menambah modul native
    berarti APK baru).
- Layar request account lama → redirect ke login (rute tetap ada supaya deep
  link lama tidak 404).
- Kalau `Linking.openURL` gagal (tidak ada aplikasi email), tampilkan pesan
  yang menyuruh menyalin email secara manual.

## Kriteria selesai

- [x] Tidak ada lagi jalan di UI ke form request account.
- [x] Teks dan template email identik dengan web.
- [x] Hanya perubahan JavaScript (OTA ke runtime 1.1.0).
- [x] lint + typecheck mobile hijau.

## Langkah manusia

- [ ] Dicek di simulator/perangkat: tampilan dialog, salin email dengan tekan
      lama (iOS & Android), aplikasi email terbuka, pesan "tidak ada aplikasi
      email", redirect `/request-account` → login.

## Comments

- 2026-11-19 (agent): dibangun di mobile-tam commit 161b140 (branch
  `spec/divisi-sabtu-request-account`). `src/lib/contact-admin.ts` menyalin
  teks + builder mailto web apa adanya; kesamaan dicek dengan skrip Node yang
  membandingkan keluaran mobile dan `lib/contact-admin.ts` web. `tsc --noEmit`
  + `expo lint` hijau. Simulator belum dicek → dipindah ke Langkah manusia.
  Di luar tiket: dialog punya tombol "Tutup" + tutup lewat backdrop/tombol back;
  teks petunjuk tekan-lama dan pesan gagal khusus mobile.
