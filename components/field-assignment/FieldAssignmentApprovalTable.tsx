"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { EyeOpenIcon as Eye } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import { AttendanceApproval, TransportationType } from "@/generated/prisma";
import { APPROVAL_STATUS_LABEL, APPROVAL_STATUS_VARIANT } from "@/lib/approval";
import { TRANSPORTATION_LABEL, formatRupiah } from "@/lib/field-assignment";

export type FieldAssignmentApprovalRow = {
  id: string;
  employeeNames: string;
  createdByName: string;
  dateRange: string;
  activityDetail: string;
  destinationCity: string | null;
  destinationAddress: string | null;
  purpose: string | null;
  companyName: string | null;
  transportation: TransportationType | null;
  transportationOther: string | null;
  estimatedCost: number | null;
  attachmentUrl: string;
  status: AttendanceApproval;
  reviewNote: string | null;
  reviewedBy: string | null;
};

export default function FieldAssignmentApprovalTable({
  rows,
  detailBasePath,
}: {
  rows: FieldAssignmentApprovalRow[];
  /** Prefix rute halaman detail milik role ini, mis. "/manager/dinas-luar". */
  detailBasePath: string;
}) {
  const columns: ColumnDef<FieldAssignmentApprovalRow>[] = [
    {
      accessorKey: "employeeNames",
      header: "Karyawan",
      cell: ({ row }) => (
        <p className="max-w-xs" title={row.original.employeeNames}>
          {row.original.employeeNames}
        </p>
      ),
    },
    {
      accessorKey: "createdByName",
      header: "Diajukan oleh",
    },
    {
      accessorKey: "dateRange",
      header: "Tanggal",
    },
    {
      accessorKey: "activityDetail",
      header: "Kegiatan/Tujuan",
      cell: ({ row }) => (
        <p className="max-w-xs truncate" title={row.original.activityDetail}>
          {row.original.activityDetail}
        </p>
      ),
    },
    {
      id: "detailPerjalanan",
      header: "Detail Perjalanan",
      cell: ({ row }) => {
        const r = row.original;
        const transportationLabel = r.transportation
          ? r.transportation === TransportationType.LAINNYA
            ? r.transportationOther || TRANSPORTATION_LABEL[r.transportation]
            : TRANSPORTATION_LABEL[r.transportation]
          : null;

        return (
          <div className="text-xs">
            {r.destinationCity && <p>Tujuan: {r.destinationCity}</p>}
            {r.purpose && <p>Keperluan: {r.purpose}</p>}
            {r.companyName && <p>Instansi: {r.companyName}</p>}
            {transportationLabel && <p>Transportasi: {transportationLabel}</p>}
            {r.estimatedCost !== null && (
              <p>Estimasi Biaya: {formatRupiah(r.estimatedCost)}</p>
            )}
            {!r.destinationCity &&
              !r.purpose &&
              !r.companyName &&
              !transportationLabel &&
              r.estimatedCost === null && (
                <span className="text-muted-foreground">—</span>
              )}
          </div>
        );
      },
    },
    {
      id: "attachment",
      header: "Rincian Biaya",
      cell: ({ row }) => (
        <Button asChild variant="ghost" size="sm">
          <Link href={row.original.attachmentUrl} target="_blank">
            Lihat
          </Link>
        </Button>
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
        const isMyTurn = row.original.status === AttendanceApproval.PENDING;

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
      emptyMessage="Tidak ada pengajuan dinas luar untuk filter ini."
      filters={(instance) => (
        <SearchDataTable
          table={instance}
          column="employeeNames"
          placeholder="Cari nama karyawan..."
        />
      )}
    />
  );
}
