import { EmploymentForm } from "@/components/mobile/employee-data/employment-form";
import { EmploymentDataService } from "@/servers/services/employee-profile.service";
import { requireUser } from "@/lib/session";

export default async function KepegawaianPage() {
  const user = await requireUser();
  const employmentData = await EmploymentDataService.getByUserId(user.id);

  return (
    <EmploymentForm
      initial={
        employmentData
          ? {
              employeeNumber: employmentData.employeeNumber,
              workLocation: employmentData.workLocation,
              employmentStatus: employmentData.employmentStatus,
              startDate: employmentData.startDate.toISOString(),
              contractEndDate:
                employmentData.contractEndDate?.toISOString() ?? null,
            }
          : null
      }
    />
  );
}
