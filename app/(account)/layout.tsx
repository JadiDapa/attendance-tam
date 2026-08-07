import { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Halaman yang dipakai kedua role (mis. profil). Cukup `requireUser()` — tidak
 * ada pengecekan role, jadi admin dan karyawan sama-sama boleh masuk.
 */
export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
