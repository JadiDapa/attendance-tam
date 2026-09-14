import { ReactNode } from "react";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function ManagerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(Role.MANAGER);

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
