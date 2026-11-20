Status: resolved
Repo: attendance-tam
Blocked by: —

# 01 — Pasang Vitest untuk modul aturan bebas-Prisma

Spec: `../spec.md` (Testing Decisions)

## Yang dibangun

Test runner pertama di repo ini, khusus untuk modul aturan domain bebas-Prisma
(pola modul jadwal kerja / hari libur / work-mode). Sebagai bukti jalan,
tulis test untuk satu aturan yang **sudah ada** (mis. `isLateAt()` atau
ringkasan minggu di modul jadwal kerja) — tanpa mengubah perilaku.

## Kriteria selesai

- [x] Vitest terpasang sebagai **devDependency** saja; tidak ada perubahan
      dependency runtime.
- [x] `npm test` menjalankan semua test sekali (bukan watch).
- [x] Alias `@/` berfungsi di test, sama seperti di `tsconfig`.
- [x] Minimal satu file test untuk aturan yang sudah ada, hijau.
- [x] `npm run lint`, `tsc --noEmit`, dan `npm run build` tetap hijau
      (file test tidak ikut ter-bundle, tidak memicu error lint baru).
- [x] Test **tidak** menyentuh Prisma, DB, atau Clerk.

## Catatan

- Fixture sebaiknya memakai data jadwal produksi nyata: Senin–Jumat
  08:00–17:00, Sabtu 08:00–14:00, Minggu libur.

## Comments

**2026-11-18 — selesai di `0beea2a`** (`test: add Vitest for Prisma-free rule modules`)

- `npm test` = `vitest run`; hanya mengambil `lib/**/*.test.ts`. Alias `@/`
  dideklarasikan eksplisit di `vitest.config.ts`.
- Bukti jalan: `lib/work-schedule.test.ts` (12 test, aturan yang sudah ada,
  tanpa perubahan perilaku), fixture Sabtu pulang lebih awal.
- Versi: `vitest ^4` (v5 butuh `@types/node ^22`, repo masih `^20`) dan
  `vite ^7` (v8 butuh `postcss ^8.5.32`, yang akan menaikkan paket produksi
  yang ter-hoist). Lockfile hanya menambah paket dev.
- Catatan untuk ticket berikutnya: install dengan `--legacy-peer-deps=false`
  (config npm global mengaktifkannya dan merombak lockfile). `npm run lint`
  masih punya 3 error lama di file yang tidak disentuh ticket ini.
- Belum: `npm test` belum dicatat di blok Commands `CLAUDE.md` (ticket 15).
