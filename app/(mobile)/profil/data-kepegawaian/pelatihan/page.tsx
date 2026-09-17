import { TrainingForm } from "@/components/mobile/employee-data/training-form";
import { TrainingService } from "@/servers/services/employee-profile.service";
import { requireUser } from "@/lib/session";

export default async function PelatihanPage() {
  const user = await requireUser();
  const training = await TrainingService.getByUserId(user.id);

  return <TrainingForm initial={training} />;
}
