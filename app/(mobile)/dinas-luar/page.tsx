import { DinasLuarScreen } from "@/components/mobile/dinas-luar/dinas-luar-screen";
import { NotificationService } from "@/servers/services/notification.service";
import { requireUser } from "@/lib/session";

// Mirrors `mobile/src/app/dinas-luar.tsx` — role-dependent (supervisor:
// creator view + create button; others: read-only assignee view).
export default async function DinasLuarPage() {
  const user = await requireUser();
  const badges = await NotificationService.forUser(user);
  const pendingReviewCount = Object.values(badges).reduce(
    (sum, n) => sum + n,
    0,
  );

  return (
    <DinasLuarScreen role={user.role} pendingReviewCount={pendingReviewCount} />
  );
}
