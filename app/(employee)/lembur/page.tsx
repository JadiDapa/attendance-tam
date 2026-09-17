import { LemburScreen } from "@/components/mobile/lembur/lembur-screen";
import { requireUser } from "@/lib/session";

// Mirrors `mobile/src/app/(tabs)/(lembur)/index.tsx` — shown to every role,
// same as the RN tab bar. New route on web (no existing shared desktop
// overtime self-service page at this URL — each role has its own
// `/{role}/lembur-saya`), but calls the same `startOvertime`/`endOvertime`
// server actions those pages already use.
export default async function LemburPage() {
  const user = await requireUser();

  return <LemburScreen role={user.role} />;
}
