"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { CheckIcon as Check, Cross2Icon as X } from "@radix-ui/react-icons";
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
import { LeaveStatus } from "@/generated/prisma";
import { LEAVE_STATUS_LABEL, LEAVE_STATUS_VARIANT } from "@/lib/leave";
import { reviewLeaveRequest } from "@/app/action/leave.action";

export type LeaveApprovalRow = {
  id: string;
  employeeName: string;
  employeePosition: string;
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

type ReviewTarget = {
  row: LeaveApprovalRow;
  status: typeof LeaveStatus.APPROVED | typeof LeaveStatus.REJECTED;
};

export default function LeaveApprovalTable({
  rows,
}: {
  rows: LeaveApprovalRow[];
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

    const result = await reviewLeaveRequest(target.row.id, {
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
        row.original.status === LeaveStatus.PENDING ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Setujui"
              onClick={() =>
                setTarget({ row: row.original, status: LeaveStatus.APPROVED })
              }
            >
              <Check className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Tolak"
              onClick={() =>
                setTarget({ row: row.original, status: LeaveStatus.REJECTED })
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

  const isApprove = target?.status === LeaveStatus.APPROVED;

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        title="Cari"
        emptyMessage="Tidak ada pengajuan untuk filter ini."
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
              {isApprove ? "Setujui Pengajuan" : "Tolak Pengajuan"}
            </DialogTitle>
            <DialogDescription>
              {target &&
                `${target.row.typeLabel} · ${target.row.employeeName} · ${target.row.dateRange}`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reviewNote">Catatan (opsional)</Label>
            <Textarea
              id="reviewNote"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isApprove
                  ? "Contoh: disetujui, jangan lupa serah terima tugas"
                  : "Contoh: kuota cuti sudah habis"
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
