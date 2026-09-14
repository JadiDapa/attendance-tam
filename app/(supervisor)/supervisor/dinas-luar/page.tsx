import PageHeader from "@/components/dashboard/PageHeader";
import FieldAssignmentForm from "@/components/field-assignment/FieldAssignmentForm";
import FieldAssignmentList, {
  type FieldAssignmentListRow,
} from "@/components/field-assignment/FieldAssignmentList";
import { Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";
import { UserService } from "@/servers/services/user.service";

export default async function SupervisorDinasLuarPage() {
  const supervisor = await requireRole(Role.SUPERVISOR);

  const [employees, requests] = await Promise.all([
    UserService.list({ role: Role.EMPLOYEE, isActive: true }),
    FieldAssignmentService.list({ createdById: supervisor.id }),
  ]);

  const rows: FieldAssignmentListRow[] = requests.map((request) => ({
    id: request.id,
    employeeNames: request.employees.map((employee) => employee.name).join(", "),
    dateRange:
      request.startDate.getTime() === request.endDate.getTime()
        ? formatWorkDate(request.startDate)
        : `${formatWorkDate(request.startDate)} — ${formatWorkDate(request.endDate)}`,
    activityDetail: request.activityDetail,
    destinationCity: request.destinationCity,
    destinationAddress: request.destinationAddress,
    purpose: request.purpose,
    companyName: request.companyName,
    transportation: request.transportation,
    transportationOther: request.transportationOther,
    estimatedCost: request.estimatedCost,
    attachmentUrl: request.attachmentUrl,
    status: request.status,
    reviewNote: request.reviewNote,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dinas Luar"
        subtitle="Tugaskan karyawan untuk dinas luar — perlu persetujuan manager."
        actions={
          <FieldAssignmentForm
            today={toDateInputValue(getWorkDate())}
            employees={employees.map((employee) => ({
              id: employee.id,
              name: employee.name,
              position: employee.position,
            }))}
          />
        }
      />

      <FieldAssignmentList rows={rows} detailBasePath="/supervisor/dinas-luar" />
    </div>
  );
}
