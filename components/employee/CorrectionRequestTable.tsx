"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { X } from "lucide-react";
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
import { CorrectionStatus } from "@/generated/prisma";
import {
  CORRECTION_STATUS_LABEL,
  CORRECTION_STATUS_VARIANT,
} from "@/lib/correction";
import { cancelCorrectionRequest } from "@/app/action/correction.action";

export type CorrectionRow = {
  id: string;
  dateLabel: string;
  typeLabel: string;
  requestedTime: string;
  reason: string;
  status: CorrectionStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
};

export default function CorrectionRequestTable({
  rows,
}: {
  rows: CorrectionRow[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<CorrectionRow | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmCancel = () => {
    if (!target) return;

    startTransition(async () => {
      const result = await cancelCorrectionRequest(target.id);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(result.message);
      setTarget(null);
      router.refresh();
    });
  };

  const columns: ColumnDef<CorrectionRow>[] = [
    {
      accessorKey: "dateLabel",
      header: "Tanggal",
      cell: ({ row }) => (
        <span className="font-medium whitespace-nowrap">
          {row.original.dateLabel}
        </span>
      ),
    },
    {
      accessorKey: "typeLabel",
      header: "Jenis",
      cell: ({ row }) => (
        <div>
          <p>{row.original.typeLabel}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            jam {row.original.requestedTime}
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
          <Badge variant={CORRECTION_STATUS_VARIANT[row.original.status]}>
            {CORRECTION_STATUS_LABEL[row.original.status]}
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
      accessorKey: "createdAt",
      header: "Diajukan",
      cell: ({ row }) => (
        <span className="text-muted-foreground whitespace-nowrap">
          {row.original.createdAt}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) =>
        row.original.status === CorrectionStatus.PENDING ? (
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
        emptyMessage="Belum ada pengajuan koreksi."
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
                `Pengajuan ${target.typeLabel.toLowerCase()} pada ${target.dateLabel} akan dihapus. Kamu bisa mengajukan ulang kapan saja.`}
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
