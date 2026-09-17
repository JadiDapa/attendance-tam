import { MobileComingSoon } from "@/components/mobile/coming-soon";
import { requireUser } from "@/lib/session";

// TODO(mobile-parity): face enrollment camera flow, mirrors
// `mobile/src/app/face-enrollment.tsx`. See MOBILE_PARITY.md build order.
export default async function VerifikasiWajahPage() {
  const user = await requireUser();

  return <MobileComingSoon title="Verifikasi Wajah" role={user.role} />;
}
