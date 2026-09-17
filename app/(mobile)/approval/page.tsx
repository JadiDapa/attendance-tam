import { ApprovalScreen } from "@/components/mobile/approval/approval-screen";
import { NotificationService } from "@/servers/services/notification.service";
import { Role } from "@/generated/prisma";
import { requireAnyRole } from "@/lib/session";

// Mirrors `mobile/src/app/(tabs)/(approval)/index.tsx` — SUPERVISOR/MANAGER
// only (ADMIN doesn't review anything, per the app's approval flow).
export default async function ApprovalPage() {
  const user = await requireAnyRole([Role.SUPERVISOR, Role.MANAGER]);
  const badges = await NotificationService.forUser(user);
  const pendingReviewCount = Object.values(badges).reduce(
    (sum, n) => sum + n,
    0,
  );

  return (
    <ApprovalScreen role={user.role} pendingReviewCount={pendingReviewCount} />
  );
}
