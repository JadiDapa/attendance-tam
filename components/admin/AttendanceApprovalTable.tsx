"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
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
import { AttendanceApproval } from "@/generated/prisma";
import {
  APPROVAL_MODES,
  WORK_MODE_HINT,
  WORK_MODE_LABEL,
  type WorkModeValue,
} from "@/lib/work-mode";
import { cn } from "@/lib/utils";
import { reviewAttendance } from "@/app/action/attendance.action";

export type AttendanceApprovalRow = {
  id: string;
  employeeName: string;
  employeePosition: string;
  dateLabel: string;
  typeLabel: string;
  time: string;
  distanceLabel: string;
  accuracyLabel: string;
  officeRadiusLabel: string;
  photoUrl: string | null;
  mapUrl: string | null;
  /** Mode yang diklaim karyawan sendiri. */
  claimedMode: WorkModeValue;
  /** Penjelasan yang ditulis karyawan saat absen. */
  detail: string | null;
  isLate: boolean;
};

export default function AttendanceApprovalTable({
  rows,
}: {
  rows: AttendanceApprovalRow[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<AttendanceApprovalRow | null>(null);
  const [mode, setMode] = useState<WorkModeValue>("WFH");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(
    null,
  );

  const openDialog = (row: AttendanceApprovalRow) => {
    setTarget(row);
    // Default ke klaim karyawan — admin tinggal menyetujui kalau setuju.
    setMode(row.claimedMode);
    setNote("");
  };

  const closeDialog = () => {
    setTarget(null);
    setNote("");
  };

  const decide = async (
    status:
      | typeof AttendanceApproval.APPROVED
      | typeof AttendanceApproval.REJECTED,
  ) => {
    if (!target) return;

    const isApprove = status === AttendanceApproval.APPROVED;
    setSubmitting(isApprove ? "approve" : "reject");

    const result = await reviewAttendance(target.id, {
      status,
      mode: isApprove ? mode : null,
      reviewNote: note,
    });

    setSubmitting(null);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    closeDialog();
    router.refresh();
  };

  const columns: ColumnDef<AttendanceApprovalRow>[] = [
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
      header: "Waktu",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <p>{row.original.dateLabel}</p>
          <p className="text-muted-foreground text-xs tabular-nums">
            {row.original.typeLabel} · {row.original.time}
          </p>
        </div>
      ),
    },
    {
      id: "claim",
      header: "Alasan",
      cell: ({ row }) => (
        <div className="max-w-xs space-y-1">
          <Badge variant="default">
            {WORK_MODE_LABEL[row.original.claimedMode]}
          </Badge>
          {row.original.detail && (
            <p className="text-muted-foreground text-xs">
              {row.original.detail}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "distance",
      header: "Jarak",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <p className="font-medium">{row.original.distanceLabel}</p>
          <p className="text-muted-foreground text-xs">
            radius {row.original.officeRadiusLabel} · akurasi{" "}
            {row.original.accuracyLabel}
          </p>
        </div>
      ),
    },
    {
      id: "bukti",
      header: "Bukti",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.photoUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={row.original.photoUrl} target="_blank" rel="noreferrer">
                Foto
              </a>
            </Button>
          )}
          {row.original.mapUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={row.original.mapUrl} target="_blank" rel="noreferrer">
                Peta
              </a>
            </Button>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          title="Tinjau"
          onClick={() => openDialog(row.original)}
        >
          <ShieldCheck className="size-4" />
          Tinjau
        </Button>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={rows}
        title="Cari"
        emptyMessage="Tidak ada absensi yang menunggu persetujuan."
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approval Absensi Luar Kantor</DialogTitle>
            <DialogDescription>
              {target &&
                `${target.employeeName} · ${target.typeLabel} ${target.dateLabel} jam ${target.time} · ${target.distanceLabel} dari kantor`}
            </DialogDescription>
          </DialogHeader>

          {target?.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.photoUrl}
              alt="Foto absensi"
              className="bg-muted aspect-4/3 w-full rounded-lg object-cover"
            />
          )}

          {target?.detail && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium">
                Penjelasan karyawan · {WORK_MODE_LABEL[target.claimedMode]}
              </p>
              <p className="mt-1 text-sm">{target.detail}</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Setujui sebagai</Label>
            <div className="grid gap-2">
              {APPROVAL_MODES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    mode === option
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {WORK_MODE_LABEL[option]}
                    {target?.claimedMode === option && (
                      <span className="text-muted-foreground text-xs font-normal">
                        (klaim karyawan)
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {WORK_MODE_HINT[option]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reviewNote">Catatan (opsional)</Label>
            <Textarea
              id="reviewNote"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              placeholder="Contoh: sudah dikonfirmasi atasan"
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => decide(AttendanceApproval.REJECTED)}
              disabled={submitting !== null}
            >
              {submitting === "reject" && <Spinner />}
              Tolak → Alfa
            </Button>
            <Button
              onClick={() => decide(AttendanceApproval.APPROVED)}
              disabled={submitting !== null}
            >
              {submitting === "approve" && <Spinner />}
              Setujui
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
