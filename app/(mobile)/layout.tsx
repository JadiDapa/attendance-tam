import { ReactNode } from "react";
import { requireUser } from "@/lib/session";
import DashboardShell from "@/components/dashboard/DashboardShell";

/**
 * Mobile-parity screens shared across every role (attendance capture, face
 * enrollment, notifications, dinas luar) — `requireUser()` only, no role
 * check. Reuses `DashboardShell` so these pages sit in the same ancestor
 * context (`main` padding, old `BottomNav` breakpoint) as `(employee)`'s
 * pages — see `components/dashboard/DashboardShell.tsx` and
 * `components/mobile/coming-soon.tsx`.
 */
export default async function MobileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
