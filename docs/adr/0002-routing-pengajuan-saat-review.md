# Pengajuan diarahkan ke Supervisor Divisi saat di-review

Pengajuan (izin/sakit/cuti, Lembur, absen luar radius) **tidak menyimpan**
Divisi pemohon. Antrean seorang Supervisor Divisi dihitung saat dibuka, dari
Jabatan pemohon **hari ini**. Dipilih karena saat Divisi diperkenalkan sudah ada
ratusan Pengajuan pending (474 absen luar radius) yang dibuat sebelum Divisi
ada — dengan routing saat review, antrean lama itu terbagi sendiri begitu
Jabatan diisi, tanpa backfill di tiga tabel Pengajuan.

## Consequences

- Kalau pemohon pindah Jabatan ke Divisi lain, Pengajuannya yang masih pending
  ikut pindah ke Supervisor Divisi baru.
- Riwayat keputusan tetap stabil karena `ApprovalLog` menyimpan ringkasan saat
  keputusan diambil.
- Pemohon tanpa Jabatan → terlihat semua Supervisor; Divisi tanpa Supervisor
  Divisi → naik ke Manager.
