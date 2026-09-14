import type { Role } from "@/generated/prisma";

export const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Karyawan",
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  MANAGER: "Manager",
};

/** Halaman awal tiap role setelah login. */
export function defaultRouteForRole(role: Role) {
  switch (role) {
    case "ADMIN":
      return "/admin/dashboard";
    case "SUPERVISOR":
      return "/supervisor/izin";
    case "MANAGER":
      return "/manager/izin";
    default:
      return "/dashboard";
  }
}
