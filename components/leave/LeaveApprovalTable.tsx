"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { EyeOpenIcon as Eye } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import SelectDataTable from "@/components/dashboard/SelectDataTable";
import {
  LeaveReasonCategory,
  LeaveStage,
  LeaveStatus,
  LeaveType,
} from "@/generated/prisma";
import {
  LEAVE_REASON_CATEGORY_LABEL,
  LEAVE_STAGE_LABEL,
  LEAVE_STATUS_LABEL,
  LEAVE_STATUS_VARIANT,
  LEAVE_TYPE_LABEL,
} from "@/lib/leave";

// `LeaveApprovalRow` cuma menyimpan `typeLabel` (string), bukan `LeaveType`
// mentah, jadi filternya cocok-cocokan lewat label ini — labelnya sendiri
// sudah unik per jenis izin.
const TYPE_OPTIONS = Object.values(LeaveType).map((value) => ({
  value: LEAVE_TYPE_LABEL[value],
  label: LEAVE_TYPE_LABEL[value],
}));

export type LeaveApprovalRow = {
  id: string;
  employeeName: string;
  employeePosition: string;
  typeLabel: string;
  dateRange: string;
  days: number;
  detail: string;
  reasonCategory: LeaveReasonCategory | null;
  status: LeaveStatus;
  stage: LeaveStage;
  reviewNote: string | null;
  reviewedBy: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

export default function LeaveApprovalTable({
  rows,
  viewerStage,
  detailBasePath,
}: {
  rows: LeaveApprovalRow[];
  /** Giliran approval milik reviewer yang sedang login — dipakai untuk
   * membedakan label "Tinjau" (giliran mereka) dari "Detail" (bukan). */
  viewerStage: LeaveStage;
  /** Prefix rute halaman detail milik role ini, mis. "/admin/izin". */
  detailBasePath: string;
}) {
  const columns: ColumnDef<LeaveApprovalRow>[] = [
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
      accessorKey: "typeLabel",
      header: "Jenis",
      filterFn: "equalsString",
    },
    {
      accessorKey: "dateRange",
      header: "Tanggal",
      cell: ({ row }) => (
        <div>
          <p>{row.original.dateRange}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.days} hari
          </p>
        </div>
      ),
    },
    {
      accessorKey: "reasonCategory",
      header: "Alasan",
      cell: ({ row }) =>
        row.original.reasonCategory
          ? LEAVE_REASON_CATEGORY_LABEL[row.original.reasonCategory]
          : "—",
    },
    {
      accessorKey: "detail",
      header: "Detail",
      cell: ({ row }) => (
        <p className="max-w-xs truncate" title={row.original.detail}>
          {row.original.detail}
        </p>
      ),
    },
    {
      id: "attachment",
      header: "Lampiran",
      cell: ({ row }) =>
        row.original.attachmentUrl ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={row.original.attachmentUrl} target="_blank">
              Lihat
            </Link>
          </Button>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={LEAVE_STATUS_VARIANT[row.original.status]}>
            {LEAVE_STATUS_LABEL[row.original.status]}
          </Badge>
          {row.original.status === LeaveStatus.PENDING && (
            <p className="text-muted-foreground text-xs">
              {LEAVE_STAGE_LABEL[row.original.stage]}
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
          row.original.status === LeaveStatus.PENDING &&
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
      emptyMessage="Tidak ada pengajuan untuk filter ini."
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
            column="typeLabel"
            options={TYPE_OPTIONS}
            placeholder="Jenis"
            allLabel="Semua Jenis"
          />
        </div>
      )}
    />
  );
}
