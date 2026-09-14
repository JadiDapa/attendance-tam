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
import { AttendanceApproval, TransportationType } from "@/generated/prisma";
import { APPROVAL_STATUS_LABEL, APPROVAL_STATUS_VARIANT } from "@/lib/approval";
import { TRANSPORTATION_LABEL, formatRupiah } from "@/lib/field-assignment";
import { formatWorkDate } from "@/lib/date";
import { isImageUrl } from "@/lib/attachment";
import { reviewFieldAssignment } from "@/app/action/field-assignment.action";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";

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

export default async function FieldAssignmentDetailView({
  assignment,
  canReview,
  backHref,
  redirectTo,
}: {
  assignment: NonNullable<
    Awaited<ReturnType<typeof FieldAssignmentService.getById>>
  >;
  /** Dinas luar cuma satu langkah approval (manager) — tidak ada `stage`,
   * jadi caller yang menentukan apakah viewer boleh mereview. */
  canReview: boolean;
  backHref: string;
  redirectTo: string;
}) {
  const dateRange =
    assignment.startDate.getTime() === assignment.endDate.getTime()
      ? formatWorkDate(assignment.startDate)
      : `${formatWorkDate(assignment.startDate)} — ${formatWorkDate(assignment.endDate)}`;
  const employeeNames = assignment.employees.map((e) => e.name).join(", ");
  const transportationLabel = assignment.transportation
    ? assignment.transportation === TransportationType.LAINNYA
      ? assignment.transportationOther ||
        TRANSPORTATION_LABEL[assignment.transportation]
      : TRANSPORTATION_LABEL[assignment.transportation]
    : "—";
  const reviewAllowed =
    canReview && assignment.status === AttendanceApproval.PENDING;

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
        title="Dinas Luar"
        subtitle={employeeNames}
        actions={
          <Badge variant={APPROVAL_STATUS_VARIANT[assignment.status]}>
            {APPROVAL_STATUS_LABEL[assignment.status]}
          </Badge>
        }
      />

      <Panel
        title="Informasi Penugasan"
        icon={Person}
        contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
      >
        <div className="sm:col-span-2">
          <Field label="Karyawan" value={employeeNames} />
        </div>
        <Field label="Diajukan oleh" value={assignment.createdBy.name} />
        <Field label="Tanggal" value={dateRange} />
        <div className="sm:col-span-2">
          <Field label="Kegiatan/Tujuan" value={assignment.activityDetail} />
        </div>
        <Field label="Tujuan Kota" value={assignment.destinationCity || "—"} />
        <Field
          label="Lokasi/Alamat Tujuan"
          value={assignment.destinationAddress || "—"}
        />
        <Field label="Keperluan Dinas" value={assignment.purpose || "—"} />
        <Field
          label="Instansi yang Dikunjungi"
          value={assignment.companyName || "—"}
        />
        <Field label="Transportasi" value={transportationLabel} />
        <Field
          label="Estimasi Biaya"
          value={
            assignment.estimatedCost !== null
              ? formatRupiah(assignment.estimatedCost)
              : "—"
          }
        />
      </Panel>

      <Panel
        title="Rincian Biaya"
        icon={FileText}
        contentClassName="p-4 sm:p-5"
      >
        {isImageUrl(assignment.attachmentUrl) ? (
          <a
            href={assignment.attachmentUrl}
            target="_blank"
            rel="noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assignment.attachmentUrl}
              alt="Rincian biaya"
              className="max-h-96 rounded-lg border object-contain"
            />
          </a>
        ) : (
          <a
            href={assignment.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary text-sm underline"
          >
            Buka lampiran
          </a>
        )}
      </Panel>

      {(assignment.reviewedBy || assignment.reviewNote) && (
        <Panel
          title="Riwayat Review"
          icon={FileText}
          contentClassName="grid gap-4 p-4 sm:grid-cols-2 sm:p-5"
        >
          <Field
            label="Direview oleh"
            value={assignment.reviewedBy?.name ?? "—"}
          />
          <Field
            label="Pada"
            value={
              assignment.reviewedAt
                ? formatWorkDate(assignment.reviewedAt)
                : "—"
            }
          />
          <div className="sm:col-span-2">
            <Field label="Catatan" value={assignment.reviewNote || "—"} />
          </div>
        </Panel>
      )}

      {reviewAllowed && (
        <ReviewActions
          id={assignment.id}
          entityLabel="Dinas Luar"
          subtitle={`${employeeNames} · ${dateRange}`}
          reviewAction={reviewFieldAssignment}
          redirectTo={redirectTo}
          rejectPlaceholder="Contoh: tidak ada anggaran perjalanan"
        />
      )}
    </div>
  );
}
