import PageHeader from "@/components/dashboard/PageHeader";
import LeaveApprovalTable, {
  type LeaveApprovalRow,
} from "@/components/admin/LeaveApprovalTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LeaveStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate } from "@/lib/date";
import {
  LEAVE_STATUS_LABEL,
  LEAVE_TYPE_LABEL,
  countLeaveDays,
} from "@/lib/leave";
import { LeaveService } from "@/servers/services/leave.service";

type SearchParams = { status?: string };

const STATUS_OPTIONS = Object.values(LeaveStatus);

export default async function AdminIzinPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const params = await searchParams;
  const statusFilter = STATUS_OPTIONS.includes(params.status as LeaveStatus)
    ? (params.status as LeaveStatus)
    : null;

  const requests = await LeaveService.list();

  const rows: LeaveApprovalRow[] = requests
    .filter((request) => !statusFilter || request.status === statusFilter)
    .map((request) => ({
      id: request.id,
      employeeName: request.user.name,
      employeePosition: request.user.position ?? "",
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
      <PageHeader
        title="Pengajuan Izin"
        subtitle="Setujui atau tolak pengajuan izin, sakit, dan cuti karyawan."
      />

      <form className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            id="status"
            name="status"
            defaultValue={statusFilter ?? ""}
            className="w-44"
          >
            <option value="">Semua status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {LEAVE_STATUS_LABEL[status]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit">Terapkan</Button>
      </form>

      <div className="grid gap-4 sm:grid-cols-3">
        {STATUS_OPTIONS.map((status) => (
          <Card key={status}>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm">
                {LEAVE_STATUS_LABEL[status]}
              </p>
              <p className="text-2xl font-bold">{countByStatus(status)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <LeaveApprovalTable rows={rows} />
    </div>
  );
}
