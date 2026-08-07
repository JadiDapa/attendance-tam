"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import DataTable from "@/components/dashboard/DataTable";
import SearchDataTable from "@/components/dashboard/SearchDataTable";
import { CorrectionStatus } from "@/generated/prisma";
import {
  CORRECTION_STATUS_LABEL,
  CORRECTION_STATUS_VARIANT,
} from "@/lib/correction";
import { reviewCorrectionRequest } from "@/app/action/correction.action";

export type CorrectionApprovalRow = {
  id: string;
  employeeName: string;
  employeePosition: string;
  dateLabel: string;
  typeLabel: string;
  requestedTime: string;
  reason: string;
  status: CorrectionStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
};

type ReviewTarget = {
  row: CorrectionApprovalRow;
  status: typeof CorrectionStatus.APPROVED | typeof CorrectionStatus.REJECTED;
};

export default function CorrectionApprovalTable({
  rows,
}: {
  rows: CorrectionApprovalRow[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const closeDialog = () => {
    setTarget(null);
    setNote("");
  };

  const confirmReview = async () => {
    if (!target) return;

    setSubmitting(true);

    const result = await reviewCorrectionRequest(target.row.id, {
      status: target.status,
      reviewNote: note,
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    closeDialog();
    router.refresh();
  };

  const columns: ColumnDef<CorrectionApprovalRow>[] = [
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
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{row.original.dateLabel}</span>
      ),
    },
    {
      accessorKey: "typeLabel",
      header: "Koreksi",
      cell: ({ row }) => (
        <div>
          <p>{row.original.typeLabel}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            jadi jam {row.original.requestedTime}
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
      id: "actions",
      header: "Aksi",
      cell: ({ row }) =>
        row.original.status === CorrectionStatus.PENDING ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Setujui"
              onClick={() =>
                setTarget({
                  row: row.original,
                  status: CorrectionStatus.APPROVED,
                })
              }
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Tolak"
              onClick={() =>
                setTarget({
                  row: row.original,
                  status: CorrectionStatus.REJECTED,
                })
              }
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  const isApprove = target?.status === CorrectionStatus.APPROVED;

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        title="Cari"
        emptyMessage="Tidak ada pengajuan koreksi untuk filter ini."
        filters={(instance) => (
          <SearchDataTable
            table={instance}
            column="employeeName"
            placeholder="Cari nama karyawan..."
          />
        )}
      />

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isApprove ? "Setujui Koreksi" : "Tolak Koreksi"}
            </DialogTitle>
            <DialogDescription>
              {target &&
                `${target.row.employeeName} · ${target.row.typeLabel} ${target.row.dateLabel} jam ${target.row.requestedTime}`}
            </DialogDescription>
          </DialogHeader>

          {isApprove && (
            <p className="text-muted-foreground text-sm">
              Absensi akan langsung tercatat tanpa foto dan lokasi, lalu
              ditandai sebagai pencatatan manual di rekap dan laporan.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reviewNote">Catatan (opsional)</Label>
            <Textarea
              id="reviewNote"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isApprove
                  ? "Contoh: sudah dicek ke atasan langsung"
                  : "Contoh: tidak ada konfirmasi dari atasan"
              }
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={confirmReview}
              disabled={submitting}
              variant={isApprove ? "default" : "destructive"}
            >
              {submitting && <Spinner />}
              {isApprove ? "Setujui" : "Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
