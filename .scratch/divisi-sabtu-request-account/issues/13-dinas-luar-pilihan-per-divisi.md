Status: resolved
Repo: attendance-tam
Blocked by: 11

# 13 — Dinas luar: pilihan karyawan dibatasi ke Divisi supervisor

Spec: `../spec.md` (§2 Dinas luar). User story 40–41.

## Yang dibangun

- Daftar karyawan yang bisa dipilih Supervisor saat membuat Dinas luar
  (`GET /api/users` untuk mobile dan form web) dibatasi ke Divisi Supervisor
  itu. Supervisor tanpa Jabatan melihat semua (seperti sekarang).
- Aksi buat Dinas luar menolak karyawan di luar Divisi Supervisor (validasi
  server, bukan hanya UI).
- Approval Dinas luar tetap oleh Manager — tidak berubah.

## Kriteria selesai

- [x] Dwiky (Supervisor Teknis) hanya melihat anggota Divisi Teknis di
      pemilih; mengirim id anggota Divisi Admin lewat API ditolak.
- [x] Mobile 1.1.0 tidak perlu diubah.
- [x] lint + `tsc --noEmit` hijau.

## Comments

- Satu filter untuk pemilih dan validasi: `FieldAssignmentService.listAssignableEmployees()`
  (form web `/supervisor/dinas-luar` + `GET /api/users`, dipakai juga web mobile) dan
  `FieldAssignmentService.areAssignable()` (aksi `createFieldAssignment`, juga di balik
  `POST /api/field-assignment`). Diuji di `servers/services/field-assignment.service.int.test.ts`
  dengan skenario Dwiky (Divisi Teknis) vs anggota Divisi Admin.
- Karyawan **tanpa Jabatan** tidak muncul di pemilih Supervisor Divisi (dibaca
  ketat: "hanya anggota Divisi"); hanya Supervisor tanpa Jabatan yang bisa
  menugaskan mereka. Beda dengan routing Pengajuan (pemohon tanpa Jabatan
  terlihat semua Supervisor) — ubah `assignableWhere()` kalau ingin disamakan.
- Mobile 1.1.0: bentuk respons `GET /api/users` (`{ items: [{ id, name, position }] }`)
  tidak berubah; `../mobile-tam/src/lib/queries.ts` membacanya apa adanya.
- `npm run check` hijau (lint 0 error, typecheck, unit, integration). Belum dicek
  visual di browser.

**2026-11-19 (review)** — Perbaikan hasil code review:
- `assignableWhere()` kini gagal tertutup: Jabatan Supervisor yang tidak
  ditemukan (mis. dihapus setelah sesi dimuat) → tidak ada karyawan yang bisa
  dipilih/ditugaskan (dulu jatuh ke "semua karyawan"). Divisi dibaca lewat
  `ApprovalRoutingService.getUserDivisionId()`, bukan query Position sendiri.
  Integration test baru di `field-assignment.service.int.test.ts`.
- Id dobel hanya dibuang sekali, di `createFieldAssignment`; `areAssignable()`
  menerima id unik dan menggabungkan filter lewat `AND` (spread lama bisa
  menimpa filter `id`).
- `npm run check` hijau.
