import { MobileComingSoon } from "@/components/mobile/coming-soon";
import { Role } from "@/generated/prisma";
import { requireAnyRole } from "@/lib/session";

// TODO(mobile-parity): mirrors `mobile/src/app/approval-attendance-verification.tsx`
// — pending out-of-radius attendance, approve (with work-mode picker) / reject.
export default async function VerifikasiAbsensiPage() {
  const user = await requireAnyRole([Role.SUPERVISOR, Role.MANAGER]);

  return <MobileComingSoon title="Verifikasi Absensi" role={user.role} />;
}
