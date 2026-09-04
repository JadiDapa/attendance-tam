"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { toast } from "sonner";
import { Cross2Icon as X } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DataTable from "@/components/dashboard/DataTable";
import { LeaveStatus } from "@/generated/prisma";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_VARIANT } from "@/lib/leave";
import { cancelLeaveRequest } from "@/app/action/leave.action";

export type LeaveRow = {
  id: string;
  typeLabel: string;
  dateRange: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  attachmentUrl: string | null;
  createdAt: string;
};

export default function LeaveRequestTable({ rows }: { rows: LeaveRow[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<LeaveRow | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmCancel = () => {
    if (!target) return;

    startTransition(async () => {
      const result = await cancelLeaveRequest(target.id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      setTarget(null);
      router.refresh();
    });
  };

  const columns: ColumnDef<LeaveRow>[] = [
    {
      accessorKey: "typeLabel",
      header: "Jenis",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.typeLabel}</span>
      ),
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
          <Badge variant={LEAVE_STATUS_VARIANT[row.original.status]}>
            {LEAVE_STATUS_LABEL[row.original.status]}
          </Badge>
          {row.original.reviewNote && (
            <p className="text-muted-foreground max-w-xs text-xs">
              {row.original.reviewNote}
            </p>
          )}
          {row.original.reviewedBy && (
            <p className="text-muted-foreground text-xs">
              oleh {row.original.reviewedBy}
            </p>
          )}
        </div>
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
      accessorKey: "createdAt",
      header: "Diajukan",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.createdAt}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) =>
        row.original.status === LeaveStatus.PENDING ? (
          <Button
            variant="ghost"
            size="sm"
            title="Batalkan"
            onClick={() => setTarget(row.original)}
          >
            <X className="size-4" />
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        emptyMessage="Belum ada pengajuan izin."
      />

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pengajuan?</AlertDialogTitle>
            <AlertDialogDescription>
              {target &&
                `Pengajuan ${target.typeLabel.toLowerCase()} untuk ${target.dateRange} akan dihapus. Kamu bisa mengajukan ulang kapan saja.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmCancel();
              }}
              disabled={pending}
            >
              Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
