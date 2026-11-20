Status: resolved
Repo: attendance-tam
Blocked by: 09

# 10 — Form pekerja: dropdown Jabatan per Divisi

Spec: `../spec.md` (§2 Form pekerja). User story 22–23, 26.

## Yang dibangun

- Form buat & ubah pekerja di daftar pekerja admin: kolom jabatan teks bebas
  diganti **Select Jabatan**, dikelompokkan per Divisi, boleh kosong.
- Simpan memakai jalur set-Jabatan dari tiket 09 (termasuk sinkron kolom teks
  jabatan). Role tetap kolom terpisah, tidak berubah.
- Import/ekspor pekerja (bila ada jalur import jabatan teks) tetap berfungsi;
  kalau import mengisi teks jabatan, jangan mencoba mencocokkan ke Jabatan
  otomatis (cukup biarkan `positionId` null) — catat di PR kalau ditemukan.
- Tabel daftar pekerja menampilkan Jabatan + Divisi.

## Kriteria selesai

- [x] Membuat pekerja baru dengan Jabatan → `positionId` dan kolom teks terisi.
- [x] Mengosongkan Jabatan → `positionId` null.
- [x] Desktop: hanya kolom jabatan yang berubah tampilannya
      (`parity:capture --desktop`).
- [x] lint + `tsc --noEmit` hijau.

## Comments

**2026-11-18** — Diimplementasikan:
- Select Jabatan dikelompokkan per Divisi pada `CreateEmployeeForm` dan `EditEmployeeAccountForm` dengan fallback "Tanpa Jabatan" / "Kosongkan Jabatan" (`normalizePositionId`).
- Simpan menggunakan jalur set-Jabatan `DivisionService.assignPosition` (sinkron teks dan relasi `Position`).
- Manager dibatasi tanpa Jabatan sesuai ADR 0001 (`canHavePosition`).
- `WorkerTable` menampilkan format Jabatan + Divisi (`formatWorkerPosition`).
- `tsc --noEmit`, Vitest (52 passed), lint (0 errors) hijau.
