import { ChangePasswordScreen } from "@/components/mobile/profile/change-password-screen";
import { requireUser } from "@/lib/session";

// Mirrors `mobile/src/app/change-password.tsx`.
export default async function UbahPasswordPage() {
  await requireUser();

  return <ChangePasswordScreen />;
}
