import PageHeader from "@/components/dashboard/PageHeader";
import WorkScheduleForm from "@/components/admin/WorkScheduleForm";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { orderWeek } from "@/lib/work-schedule";
import {
  WorkDayService,
  WorkScheduleService,
} from "@/servers/services/setting.service";

export default async function WaktuKerjaPage() {
  await requireRole(Role.ADMIN);

  const [schedule, workDays] = await Promise.all([
    WorkScheduleService.getActive(),
    WorkDayService.list(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Waktu Kerja"
        subtitle="Hari kerja dan jam masuk/pulang per hari — dasar penentuan terlambat dan hari libur."
      />

      <WorkScheduleForm
        defaultValues={{
          lateToleranceMinutes: schedule?.lateToleranceMinutes ?? 15,
          maxAccuracyMeters: schedule?.maxAccuracyMeters ?? 100,
          // Urut Senin→Minggu supaya tampilannya mengikuti minggu kerja.
          days: orderWeek(workDays).map((day) => ({
            dayOfWeek: day.dayOfWeek,
            isWorkingDay: day.isWorkingDay,
            checkInTime: day.checkInTime,
            checkOutTime: day.checkOutTime,
          })),
        }}
      />
    </div>
  );
}
