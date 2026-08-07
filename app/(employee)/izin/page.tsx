import PageHeader from "@/components/dashboard/PageHeader";
import LeaveRequestForm from "@/components/employee/LeaveRequestForm";
import LeaveRequestTable, {
  type LeaveRow,
} from "@/components/employee/LeaveRequestTable";
import { Card, CardContent } from "@/components/ui/card";
import { LeaveStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { LEAVE_TYPE_LABEL, countLeaveDays } from "@/lib/leave";
import { LeaveService } from "@/servers/services/leave.service";

export default async function IzinPage() {
  const user = await requireRole(Role.EMPLOYEE);
  const requests = await LeaveService.list({ userId: user.id });

  const rows: LeaveRow[] = requests.map((request) => ({
    id: request.id,
    typeLabel: LEAVE_TYPE_LABEL[request.type],
    dateRange:
      request.startDate.getTime() === request.endDate.getTime()
        ? formatWorkDate(request.startDate)
        : `${formatWorkDate(request.startDate)} — ${formatWorkDate(request.endDate)}`,
    days: countLeaveDays(request.startDate, request.endDate),
    reason: request.reason,
    status: request.status,
    reviewNote: request.reviewNote,
    reviewedBy: request.reviewedBy?.name ?? null,
    attachmentUrl: request.attachmentUrl,
    createdAt: formatWorkDate(getWorkDate(request.createdAt)),
  }));

  const countByStatus = (status: LeaveStatus) =>
    requests.filter((request) => request.status === status).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Izin & Cuti"
          subtitle="Ajukan izin, sakit, atau cuti lalu pantau statusnya di sini."
        />
        <LeaveRequestForm today={toDateInputValue(getWorkDate())} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Menunggu</p>
            <p className="text-2xl font-bold">
              {countByStatus(LeaveStatus.PENDING)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Disetujui</p>
            <p className="text-2xl font-bold">
              {countByStatus(LeaveStatus.APPROVED)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">Ditolak</p>
            <p className="text-2xl font-bold">
              {countByStatus(LeaveStatus.REJECTED)}
            </p>
          </CardContent>
        </Card>
      </div>

      <LeaveRequestTable rows={rows} />
    </div>
  );
}
