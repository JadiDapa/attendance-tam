"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { EyeOpenIcon as Eye } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import SelectDataTable from "@/components/dashboard/SelectDataTable";
import { AttendanceApproval, OvertimeStage } from "@/generated/prisma";
import { APPROVAL_STATUS_LABEL, APPROVAL_STATUS_VARIANT } from "@/lib/approval";
import { OVERTIME_STAGE_LABEL } from "@/lib/overtime";

const STATUS_OPTIONS = Object.values(AttendanceApproval).map((value) => ({
  value,
  label: APPROVAL_STATUS_LABEL[value],
}));

export type OvertimeApprovalRow = {
  id: string;
  employeeName: string;
  employeePosition: string;
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

export default function OvertimeApprovalTable({
  rows,
  viewerStage,
  detailBasePath,
}: {
  rows: OvertimeApprovalRow[];
  /** Giliran approval milik reviewer yang sedang login — dipakai untuk
   * membedakan label "Tinjau" (giliran mereka) dari "Detail" (bukan). */
  viewerStage: OvertimeStage;
  /** Prefix rute halaman detail milik role ini, mis. "/admin/lembur". */
  detailBasePath: string;
}) {
  const columns: ColumnDef<OvertimeApprovalRow>[] = [
    {
      accessorKey: "employeeName",
      header: "Karyawan",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.employeeName}</p>
          {row.original.employeePosition && (
            <p className="text-muted-foreground text-xs">
              {row.original.employeePosition}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "dateLabel",
      header: "Tanggal",
    },
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
      filterFn: "equalsString",
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
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const isMyTurn =
          row.original.status === AttendanceApproval.PENDING &&
          row.original.stage === viewerStage;

        return (
          <Button asChild variant={isMyTurn ? "default" : "ghost"} size="sm">
            <Link href={`${detailBasePath}/${row.original.id}`}>
              <Eye className="size-4" />
              {isMyTurn ? "Tinjau" : "Detail"}
            </Link>
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={rows}
      title="Cari"
      emptyMessage="Tidak ada pengajuan lembur untuk filter ini."
      filters={(instance) => (
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <div className="w-full sm:w-64">
            <SearchDataTable
              table={instance}
              column="employeeName"
              placeholder="Cari nama karyawan..."
            />
          </div>
          <SelectDataTable
            table={instance}
            column="status"
            options={STATUS_OPTIONS}
            placeholder="Status"
            allLabel="Semua Status"
          />
        </div>
      )}
    />
  );
}
