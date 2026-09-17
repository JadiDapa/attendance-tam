import { FaceEnrollmentScreen } from "@/components/mobile/face-enrollment-screen";
import { getFaceEnrollmentStatus } from "@/app/action/face.action";
import { requireUser } from "@/lib/session";

export default async function VerifikasiWajahPage() {
  await requireUser();
  const status = await getFaceEnrollmentStatus();

  return <FaceEnrollmentScreen status={status} />;
}
