import PageHeader from "@/components/dashboard/PageHeader";
import AdminCorrectionDialog, {
  type EmployeeOption,
} from "@/components/admin/AdminCorrectionDialog";
import CorrectionApprovalTable, {
  type CorrectionApprovalRow,
} from "@/components/admin/CorrectionApprovalTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { CorrectionStatus, Role } from "@/generated/prisma";
import { requireRole } from "@/lib/session";
import { formatWorkDate, getWorkDate, toDateInputValue } from "@/lib/date";
import {
  ATTENDANCE_TYPE_LABEL,
  CORRECTION_STATUS_LABEL,
} from "@/lib/correction";
import { CorrectionService } from "@/servers/services/correction.service";
import { UserService } from "@/servers/services/user.service";

type SearchParams = { status?: string };

const STATUS_OPTIONS = Object.values(CorrectionStatus);

export default async function AdminKoreksiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(Role.ADMIN);

  const params = await searchParams;
  const statusFilter = STATUS_OPTIONS.includes(
    params.status as CorrectionStatus,
  )
    ? (params.status as CorrectionStatus)
    : null;

  const [corrections, employees] = await Promise.all([
    CorrectionService.list(),
    UserService.list({ role: Role.EMPLOYEE, isActive: true }),
  ]);

  const rows: CorrectionApprovalRow[] = corrections
    .filter((correction) => !statusFilter || correction.status === statusFilter)
    .map((correction) => ({
      id: correction.id,
      employeeName: correction.user.name,
      employeePosition: correction.user.position ?? "",
      dateLabel: formatWorkDate(correction.workDate),
      typeLabel: ATTENDANCE_TYPE_LABEL[correction.type],
      requestedTime: correction.requestedTime,
      reason: correction.reason,
      status: correction.status,
      reviewNote: correction.reviewNote,
      reviewedBy: correction.reviewedBy?.name ?? null,
      createdAt: formatWorkDate(getWorkDate(correction.createdAt)),
    }));

  const employeeOptions: EmployeeOption[] = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    position: employee.position ?? "",
  }));

  const countByStatus = (status: CorrectionStatus) =>
    corrections.filter((correction) => correction.status === status).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Koreksi Absensi"
        subtitle="Setujui pengajuan karyawan yang lupa absen, atau catat absensi secara manual."
        actions={
          <AdminCorrectionDialog
            employees={employeeOptions}
            today={toDateInputValue(getWorkDate())}
          />
        }
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
                {CORRECTION_STATUS_LABEL[status]}
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
                {CORRECTION_STATUS_LABEL[status]}
              </p>
              <p className="text-2xl font-bold">{countByStatus(status)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CorrectionApprovalTable rows={rows} />
    </div>
  );
}
