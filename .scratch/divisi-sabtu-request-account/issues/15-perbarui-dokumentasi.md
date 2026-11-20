Status: resolved
Repo: attendance-tam (+ catatan singkat di mobile-tam bila ada CLAUDE.md/README yang menyebut aturan 18:00 / 17:00 / request account)
Blocked by: 02, 04, 07, 09, 11

# 15 — Perbarui CLAUDE.md, README, dan MOBILE_PARITY.md

Spec: `../spec.md` (Further Notes).

## Yang dibangun

CLAUDE.md:
- **Perbaiki yang sudah usang:** Dinas luar disetujui **Manager** (sejak
  15 Sep 2026), bukan admin; grup rute `(employee)` memakai `requireUser()`,
  bukan khusus EMPLOYEE.
- **Tambah:** bagian Divisi/Jabatan/Supervisor Divisi + routing saat review
  (rujuk `GLOSSARY.md`, ADR 0001, ADR 0002, modul aturan routing); Jam Mulai
  Lembur per Hari Kerja dan jam pulang otomatis yang ikut Jam Pulang (ganti
  semua penyebutan "18:00"/"Otomatis pukul 17:00" yang tetap); request
  account publik ditutup (410), dialog Hubungi Admin; `npm test` (Vitest) di
  daftar Commands.
- Daftar route admin ditambah `/admin/divisi`.

README.md: fitur request account dihapus dari daftar; tambah Divisi; tambah
script `npm test`.

MOBILE_PARITY.md: baris checklist #4 (Request account) diberi catatan bahwa
fitur ditutup dan diganti dialog Hubungi Admin.

## Kriteria selesai

- [x] Tidak ada lagi klaim di dokumen yang bertentangan dengan kode (cek
      grep "18:00", "17:00", "request-account", "disetujui admin").
- [x] Istilah mengikuti `GLOSSARY.md`.

## Comments

**2026-11-19** — Diperbarui:
- `CLAUDE.md`: Dinas luar disetujui Manager; `(employee)` = `requireUser()` semua
  role; grup `(supervisor)`/`(manager)`; `/admin/divisi`; `npm test` di Commands;
  User 4 Role + `positionId`, model Division/Position; `WorkDay.overtimeStartTime`;
  `canStartOvertimeAt()`/`autoCheckOutTimeFor()`; request account ditutup (410) +
  `ContactAdminDialog`; badge mengikuti cakupan routing. Detail routing dipindah
  ke pointer, bukan ditulis di CLAUDE.md (tetap ramping).
- `docs/approval-routing.md` (baru): tabel aturan tahap × reviewer, modul
  `lib/approval-routing.ts` + `ApprovalRoutingService`, absen luar radius
  (tiket 12), pemilih Dinas luar per Divisi (tiket 13), `scripts/pemetaan-divisi.ts`
  (tiket 14).
- `docs/attendance-rules.md`: Dinas luar → Manager; reviewer absen luar radius
  per routing; batas Lembur = Jam Mulai Lembur; "Otomatis pukul <Jam Pulang>"
  (`autoCheckOutTimeFor()`); "absensi menggantung" → Absen Pulang Terlewat.
- `README.md`: request account dihapus dari fitur/struktur, `ACCOUNT_REQUEST_SECRET`
  ditandai hanya untuk pengajuan lama; tambah Divisi & Jabatan, Hubungi Admin,
  Jam Mulai Lembur, Dinas luar disetujui manager; script `typecheck`, `test`,
  `test:int`, `check`.
- `MOBILE_PARITY.md`: baris #4 sudah bercatatan (tiket 07); daftar state Auth
  tidak lagi menyebut form request-account.
- mobile-tam `README.md` (cabang `spec/divisi-sabtu-request-account`): request
  account → dialog Hubungi Admin; Lembur memakai Jam Mulai Lembur.

Grep `18:00|17:00|request-account|disetujui admin` di `*.md` luar `.scratch/`:
sisa hanya GLOSSARY (_Avoid_) dan catatan "closed" di MOBILE_PARITY/README/CLAUDE.md
— tidak ada klaim yang bertentangan dengan kode.
