import { MobileComingSoon } from "@/components/mobile/coming-soon";
import { requireUser } from "@/lib/session";

// TODO(mobile-parity): full camera + GPS check-in/out flow, mirrors
// `mobile/src/app/attendance-capture.tsx`. Scheduled last in MOBILE_PARITY.md's
// build order (highest complexity — gated loading chain, GPS accuracy states).
export default async function AbsenPage() {
  const user = await requireUser();

  return <MobileComingSoon title="Absen" role={user.role} />;
}
