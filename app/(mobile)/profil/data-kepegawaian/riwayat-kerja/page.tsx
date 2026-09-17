import { WorkHistoryForm } from "@/components/mobile/employee-data/work-history-form";
import { WorkHistoryService } from "@/servers/services/employee-profile.service";
import { requireUser } from "@/lib/session";

export default async function RiwayatKerjaPage() {
  const user = await requireUser();
  const workHistory = await WorkHistoryService.listByUserId(user.id);

  return <WorkHistoryForm initial={workHistory} />;
}
