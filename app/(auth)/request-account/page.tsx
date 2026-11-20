import { redirect } from "next/navigation";

/**
 * Pendaftaran mandiri ditutup; rute dipertahankan supaya tautan lama tidak 404.
 * Calon karyawan menghubungi admin lewat dialog Hubungi Admin di halaman login.
 */
export default function RequestAccountPage() {
  redirect("/login");
}
