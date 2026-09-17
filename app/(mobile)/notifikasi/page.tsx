import { NotificationsScreen } from "@/components/mobile/notifications-screen";
import { requireUser } from "@/lib/session";

// Mirrors `mobile/src/app/notifications.tsx` — static/hardcoded on both
// sides, no real backend for this screen (see MOBILE_PARITY.md).
export default async function NotifikasiPage() {
  const user = await requireUser();

  return <NotificationsScreen role={user.role} />;
}
