import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeftIcon as ArrowLeft,
  FileTextIcon as FileText,
  PersonIcon as Person,
} from "@radix-ui/react-icons";
import PageHeader from "@/components/dashboard/PageHeader";
import Panel from "@/components/dashboard/Panel";
import { Badge } from "@/components/ui/badge";
import ReviewActions from "@/components/approval/ReviewActions";
import { LeaveStage, LeaveStatus } from "@/generated/prisma";
import {
  LEAVE_REASON_CATEGORY_LABEL,
  LEAVE_STAGE_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_VARIANT,
  LEAVE_TYPE_LABEL,
  countLeaveDays,
} from "@/lib/leave";
import { formatWorkDate } from "@/lib/date";
import { isImageUrl } from "@/lib/attachment";
import { reviewLeaveRequest } from "@/app/action/leave.action";
import { LeaveService } from "@/servers/services/leave.service";

function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        {label}
      </p>
      <p className="text-sm font-medium wrap-break-word">{value}</p>
    </div>
  );
}

export default async function LeaveDetailView({
  leave,
  viewerStage,
  backHref,
  redirectTo,
}: {
  leave: NonNullable<Awaited<ReturnType<typeof LeaveService.getById>>>;
  viewerStage: LeaveStage;
  backHref: string;
  redirectTo: string;
}) {
  const dateRange =
    leave.startDate.getTime() === leave.endDate.getTime()
      ? formatWorkDate(leave.startDate)
      : `${formatWorkDate(leave.startDate)} — ${formatWorkDate(leave.endDate)}`;
  const days = countLeaveDays(leave.startDate, leave.endDate);
  const canReview =
    leave.status === LeaveStatus.PENDING && leave.stage === viewerStage;

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
        title={`${LEAVE_TYPE_LABEL[leave.type]} — ${leave.user.name}`}
        subtitle={leave.user.position || undefined}
        actions={
          <div className="flex flex-col items-end gap-1">
            <Badge variant={LEAVE_STATUS_VARIANT[leave.status]}>
              {LEAVE_STATUS_LABEL[leave.status]}
            </Badge>
            {leave.status === LeaveStatus.PENDING && (
              <p className="text-muted-foreground text-xs">
                {LEAVE_STAGE_LABEL[leave.stage]}
              </p>
            )}
          </div>
        }
      />

      <Panel
        title="Informasi Pengajuan"
        icon={Person}
        contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
      >
        <Field label="Karyawan" value={leave.user.name} />
        <Field label="Jabatan" value={leave.user.position || "—"} />
        <Field label="Jenis" value={LEAVE_TYPE_LABEL[leave.type]} />
        <Field label="Tanggal" value={`${dateRange} (${days} hari)`} />
        <Field
          label="Kategori Alasan"
          value={
            leave.reasonCategory
              ? LEAVE_REASON_CATEGORY_LABEL[leave.reasonCategory]
              : "—"
          }
        />
        <Field label="Diajukan" value={formatWorkDate(leave.createdAt)} />
        <div className="sm:col-span-2">
          <Field label="Detail" value={leave.detail} />
        </div>
      </Panel>

      <Panel title="Lampiran" icon={FileText} contentClassName="p-4 sm:p-5">
        {leave.attachmentUrl ? (
          isImageUrl(leave.attachmentUrl) ? (
            <a href={leave.attachmentUrl} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={leave.attachmentUrl}
                alt="Lampiran pengajuan"
                className="max-h-96 rounded-lg border object-contain"
              />
            </a>
          ) : (
            <a
              href={leave.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-sm underline"
            >
              Buka lampiran
            </a>
          )
        ) : (
          <p className="text-muted-foreground text-sm">Tidak ada lampiran.</p>
        )}
      </Panel>

      {(leave.reviewedBy || leave.reviewNote) && (
        <Panel
          title="Riwayat Review"
          icon={FileText}
          contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
        >
          <Field label="Direview oleh" value={leave.reviewedBy?.name ?? "—"} />
          <Field
            label="Pada"
            value={leave.reviewedAt ? formatWorkDate(leave.reviewedAt) : "—"}
          />
          <div className="sm:col-span-2">
            <Field label="Catatan" value={leave.reviewNote || "—"} />
          </div>
        </Panel>
      )}

      {canReview && (
        <ReviewActions
          id={leave.id}
          entityLabel={`Pengajuan ${LEAVE_TYPE_LABEL[leave.type]}`}
          subtitle={`${LEAVE_TYPE_LABEL[leave.type]} · ${leave.user.name} · ${dateRange}`}
          reviewAction={reviewLeaveRequest}
          redirectTo={redirectTo}
          approvePlaceholder="Contoh: disetujui, jangan lupa serah terima tugas"
          rejectPlaceholder="Contoh: kuota cuti sudah habis"
        />
      )}
    </div>
  );
}
