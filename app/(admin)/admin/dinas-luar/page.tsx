import {
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import FieldAssignmentApprovalTable, {
  type FieldAssignmentApprovalRow,
} from "@/components/field-assignment/FieldAssignmentApprovalTable";
import { AttendanceApproval, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate } from "@/lib/date";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

export default async function AdminDinasLuarPage() {
  await requireRole(Role.ADMIN);

  const requests = await FieldAssignmentService.list();

  const rows: FieldAssignmentApprovalRow[] = requests.map((request) => ({
    id: request.id,
    employeeNames: request.employees
      .map((employee) => employee.name)
      .join(", "),
    createdByName: request.createdBy.name,
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
    reviewedBy: request.reviewedBy?.name ?? null,
  }));

  const pending = requests.filter(
    (request) => request.status === AttendanceApproval.PENDING,
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back
        title="Pengajuan Dinas Luar"
        subtitle="Pantau penugasan dinas luar yang diajukan supervisor — disetujui oleh manager."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatTile
          label="Menunggu Keputusan"
          icon={Clock4}
          value={String(pending)}
          footerLabel="Pengajuan menunggu keputusan Anda"
          highlighted={pending > 0}
        />
        <StatTile
          label="Total Pengajuan"
          icon={CheckCircle2}
          value={String(requests.length)}
          footerLabel="Semua pengajuan dinas luar"
        />
      </div>

      <FieldAssignmentApprovalTable
        rows={rows}
        detailBasePath="/admin/dinas-luar"
        readOnly
      />
    </div>
  );
}
