"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import DataTable from "@/components/dashboard/DataTable";
import { AttendanceApproval, OvertimeStage } from "@/generated/prisma";
import { APPROVAL_STATUS_LABEL, APPROVAL_STATUS_VARIANT } from "@/lib/approval";
import { OVERTIME_STAGE_LABEL } from "@/lib/overtime";

export type SelfOvertimeRow = {
  id: string;
  dateLabel: string;
  startTime: string;
  endTime: string | null;
  durationLabel: string | null;
  reason: string;
  status: AttendanceApproval;
  stage: OvertimeStage;
  reviewNote: string | null;
  reviewedBy: string | null;
};

export default function SelfOvertimeTable({
  rows,
}: {
  rows: SelfOvertimeRow[];
}) {
  const columns: ColumnDef<SelfOvertimeRow>[] = [
    { accessorKey: "dateLabel", header: "Tanggal" },
    {
      id: "time",
      header: "Jam",
      cell: ({ row }) => (
        <div>
          <p>
            {row.original.startTime} — {row.original.endTime ?? "Berjalan"}
          </p>
          {row.original.durationLabel && (
            <p className="text-muted-foreground text-xs">
              {row.original.durationLabel}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: "Alasan",
      cell: ({ row }) => (
        <p className="max-w-xs truncate" title={row.original.reason}>
          {row.original.reason}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={APPROVAL_STATUS_VARIANT[row.original.status]}>
            {APPROVAL_STATUS_LABEL[row.original.status]}
          </Badge>
          {row.original.status === AttendanceApproval.PENDING && (
            <p className="text-muted-foreground text-xs">
              {OVERTIME_STAGE_LABEL[row.original.stage]}
            </p>
          )}
          {row.original.reviewedBy && (
            <p className="text-muted-foreground text-xs">
              oleh {row.original.reviewedBy}
            </p>
          )}
          {row.original.reviewNote && (
            <p className="text-muted-foreground max-w-xs text-xs">
              {row.original.reviewNote}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      emptyMessage="Belum ada pengajuan lembur."
    />
  );
}
