import {
  CalendarIcon as CalendarClock,
  CheckCircledIcon as CheckCircle2,
  ClockIcon as Clock4,
  CrossCircledIcon as XCircle,
} from "@radix-ui/react-icons";
import Panel from "@/components/dashboard/Panel";
import PageHeader from "@/components/dashboard/PageHeader";
import StatTile from "@/components/dashboard/StatTile";
import LeaveTypeChart from "@/components/dashboard/LeaveTypeChart";
import LeaveStatusChart from "@/components/dashboard/LeaveStatusChart";
import LeaveRequestForm from "@/components/employee/LeaveRequestForm";
import LeaveRequestTable, {
  type LeaveRow,
} from "@/components/employee/LeaveRequestTable";
import { LeaveStatus, LeaveType } from "@/generated/prisma";
import { requireUser } from "@/lib/session";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import { LEAVE_TYPE_LABEL, countLeaveDays } from "@/lib/leave";
import { LeaveService } from "@/servers/services/leave.service";
import { IzinScreen } from "@/components/mobile/izin/izin-screen";

export default async function IzinPage() {
  const user = await requireUser();
  const requests = await LeaveService.list({ userId: user.id });

  const rows: LeaveRow[] = requests.map((request) => ({
    id: request.id,
    typeLabel: LEAVE_TYPE_LABEL[request.type],
    dateRange:
      request.startDate.getTime() === request.endDate.getTime()
        ? formatWorkDate(request.startDate)
        : `${formatWorkDate(request.startDate)} — ${formatWorkDate(request.endDate)}`,
    days: countLeaveDays(request.startDate, request.endDate),
    detail: request.detail,
    reasonCategory: request.reasonCategory,
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
    <>
      <IzinScreen role={user.role} />

      <div className="hidden flex-col gap-6 md:flex">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title="Izin & Cuti"
            subtitle="Ajukan izin, sakit, atau cuti lalu pantau statusnya di sini."
          />
          <LeaveRequestForm today={toDateInputValue(getWorkDate())} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Menunggu"
            icon={Clock4}
            value={String(countByStatusMap.PENDING)}
            footerLabel="Pengajuan belum diputuskan admin"
          />
          <StatTile
            label="Disetujui"
            icon={CheckCircle2}
            value={String(countByStatusMap.APPROVED)}
            footerLabel="Pengajuan yang disetujui"
            highlighted
          />
          <StatTile
            label="Ditolak"
            icon={XCircle}
            value={String(countByStatusMap.REJECTED)}
            footerLabel="Pengajuan yang ditolak"
          />
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

        <LeaveRequestTable rows={rows} />
      </div>
    </>
  );
}
