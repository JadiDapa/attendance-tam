import { CalendarClock, CheckCircle2, Clock4, XCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import StatTile from "@/components/dashboard/StatTile";
import LeaveTypeChart from "@/components/dashboard/LeaveTypeChart";
import LeaveStatusChart from "@/components/dashboard/LeaveStatusChart";
import LeaveApprovalTable, {
  type LeaveApprovalRow,
} from "@/components/admin/LeaveApprovalTable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LeaveStatus, LeaveType, Role } from "@/generated/prisma";
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

const STATUS_ICON: Record<LeaveStatus, typeof Clock4> = {
  PENDING: Clock4,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
};

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

  const countByType: Record<LeaveType, number> = {
    IZIN: requests.filter((request) => request.type === "IZIN").length,
    SAKIT: requests.filter((request) => request.type === "SAKIT").length,
    CUTI: requests.filter((request) => request.type === "CUTI").length,
  };

  const countByStatusMap: Record<LeaveStatus, number> = {
    PENDING: countByStatus(LeaveStatus.PENDING),
    APPROVED: countByStatus(LeaveStatus.APPROVED),
    REJECTED: countByStatus(LeaveStatus.REJECTED),
  };

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
          <StatTile
            key={status}
            label={LEAVE_STATUS_LABEL[status]}
            icon={STATUS_ICON[status]}
            value={String(countByStatus(status))}
            footerLabel={`Pengajuan berstatus ${LEAVE_STATUS_LABEL[status].toLowerCase()}`}
            highlighted={status === LeaveStatus.PENDING}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Panel
          title="Pengajuan per Jenis"
          icon={CalendarClock}
          className="flex-2 p-4"
        >
          <LeaveTypeChart countByType={countByType} />
        </Panel>

        <Panel title="Status Pengajuan" icon={Clock4} className="flex flex-1">
          <LeaveStatusChart countByStatus={countByStatusMap} />
        </Panel>
      </div>

      <LeaveApprovalTable rows={rows} />
    </div>
  );
}
