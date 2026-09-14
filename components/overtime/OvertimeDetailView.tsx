import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeftIcon as ArrowLeft,
  ClockIcon as Clock,
  PersonIcon as Person,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import { Badge } from "@/components/ui/badge";
import ReviewActions from "@/components/approval/ReviewActions";
import { AttendanceApproval, OvertimeStage } from "@/generated/prisma";
import { APPROVAL_STATUS_LABEL, APPROVAL_STATUS_VARIANT } from "@/lib/approval";
import { OVERTIME_STAGE_LABEL } from "@/lib/overtime";
import { formatDuration, formatTime, formatWorkDate } from "@/lib/date";
import { reviewOvertime } from "@/app/action/overtime.action";
import { OvertimeService } from "@/servers/services/overtime.service";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-medium wrap-break-word">{value}</p>
    </div>
  );
}

export default async function OvertimeDetailView({
  overtime,
  viewerStage,
  backHref,
  redirectTo,
}: {
  overtime: NonNullable<Awaited<ReturnType<typeof OvertimeService.getById>>>;
  viewerStage: OvertimeStage;
  backHref: string;
  redirectTo: string;
}) {
  const canReview =
    overtime.status === AttendanceApproval.PENDING &&
    overtime.stage === viewerStage;
  const dateLabel = formatWorkDate(overtime.workDate);
  const startTime = formatTime(overtime.startAt);
  const endTime = overtime.endAt ? formatTime(overtime.endAt) : null;
  const durationLabel = overtime.endAt
    ? formatDuration(overtime.startAt, overtime.endAt)
    : null;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Kembali
      </Link>

      <PageHeader
        title={`Lembur — ${overtime.user.name}`}
        subtitle={overtime.user.position || undefined}
        actions={
          <div className="flex flex-col items-end gap-1">
            <Badge variant={APPROVAL_STATUS_VARIANT[overtime.status]}>
              {APPROVAL_STATUS_LABEL[overtime.status]}
            </Badge>
            {overtime.status === AttendanceApproval.PENDING && (
              <p className="text-muted-foreground text-xs">
                {OVERTIME_STAGE_LABEL[overtime.stage]}
              </p>
            )}
          </div>
        }
      />

      <Panel
        title="Informasi Lembur"
        icon={Person}
        contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
      >
        <Field label="Karyawan" value={overtime.user.name} />
        <Field label="Jabatan" value={overtime.user.position || "—"} />
        <Field label="Tanggal" value={dateLabel} />
        <Field
          label="Jam"
          value={`${startTime} — ${endTime ?? "Berjalan"}`}
        />
        {durationLabel && <Field label="Durasi" value={durationLabel} />}
        <div className="sm:col-span-2">
          <Field label="Alasan" value={overtime.reason} />
        </div>
      </Panel>

      {(overtime.reviewedBy || overtime.reviewNote) && (
        <Panel
          title="Riwayat Review"
          icon={Clock}
          contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
        >
          <Field
            label="Direview oleh"
            value={overtime.reviewedBy?.name ?? "—"}
          />
          <Field
            label="Pada"
            value={
              overtime.reviewedAt ? formatWorkDate(overtime.reviewedAt) : "—"
            }
          />
          <div className="sm:col-span-2">
            <Field label="Catatan" value={overtime.reviewNote || "—"} />
          </div>
        </Panel>
      )}

      {canReview && (
        <ReviewActions
          id={overtime.id}
          entityLabel="Lembur"
          subtitle={`${overtime.user.name} · ${dateLabel} · ${startTime}`}
          reviewAction={reviewOvertime}
          redirectTo={redirectTo}
          rejectPlaceholder="Contoh: tidak ada penugasan lembur untuk ini"
        />
      )}
    </div>
  );
}
