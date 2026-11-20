/**
 * Dialog Hubungi Admin — pengganti request account publik yang ditutup.
 * Bebas Prisma supaya bisa dipakai dialog client, route API, dan diuji Vitest.
 *
 * Semua teks dialog ada di sini (bukan di komponen) karena harus identik dengan
 * dialog Hubungi Admin di aplikasi mobile (`mobile-tam`), yang menyalinnya
 * karena tidak bisa mengimpor dari repo ini.
 */

/** Alamat tujuan permohonan akun — bukan email login akun Administrator. */
export const ADMIN_CONTACT_EMAIL = "admin@tarunagroup.co.id";

export const CONTACT_ADMIN_TITLE = "Hubungi Admin";

export const CONTACT_ADMIN_DESCRIPTION =
  "Akun absensi hanya dibuat oleh admin. Kirim email ke alamat di bawah dengan mengisi data yang diminta di template.";

/** Balasan `POST /api/account-requests` — mobile 1.1.0 menampilkannya apa adanya. */
export const ACCOUNT_REQUEST_CLOSED_MESSAGE = `Pendaftaran mandiri ditutup. Hubungi admin di ${ADMIN_CONTACT_EMAIL}.`;

export const CONTACT_ADMIN_SUBJECT = "Permohonan pembuatan akun absensi";

export const CONTACT_ADMIN_BODY = [
  "Halo Admin,",
  "",
  "Saya ingin mengajukan pembuatan akun absensi dengan data berikut:",
  "",
  "Nama:",
  "Email:",
  "No. HP:",
  "Jabatan:",
  "Divisi:",
  "",
  "Terima kasih.",
].join("\n");

/**
 * `encodeURIComponent`, bukan `URLSearchParams`: yang terakhir menulis spasi
 * sebagai `+`, dan banyak aplikasi email menampilkan `+` itu apa adanya.
 */
export function contactAdminMailto() {
  const subject = encodeURIComponent(CONTACT_ADMIN_SUBJECT);
  const body = encodeURIComponent(CONTACT_ADMIN_BODY);

  return `mailto:${ADMIN_CONTACT_EMAIL}?subject=${subject}&body=${body}`;
}
