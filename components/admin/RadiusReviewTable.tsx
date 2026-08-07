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
import { RadiusReviewStatus } from "@/generated/prisma";
import {
  RADIUS_DECISION_HINT,
  RADIUS_DECISION_OPTIONS,
  RADIUS_REVIEW_LABEL,
  RADIUS_REVIEW_SHORT,
  RADIUS_REVIEW_VARIANT,
} from "@/lib/radius-review";
import { cn } from "@/lib/utils";
import { reviewAttendanceRadius } from "@/app/action/attendance.action";

export type RadiusReviewRow = {
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
  status: RadiusReviewStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
};

type Decision = (typeof RADIUS_DECISION_OPTIONS)[number];

export default function RadiusReviewTable({
  rows,
}: {
  rows: RadiusReviewRow[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState<RadiusReviewRow | null>(null);
  const [decision, setDecision] = useState<Decision>("VALID");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const closeDialog = () => {
    setTarget(null);
    setDecision("VALID");
    setNote("");
  };

  const confirmReview = async () => {
    if (!target) return;

    setSubmitting(true);

    const result = await reviewAttendanceRadius(target.id, {
      status: decision,
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

  const columns: ColumnDef<RadiusReviewRow>[] = [
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
      id: "distance",
      header: "Jarak",
      cell: ({ row }) => (
        <div className="whitespace-nowrap">
          <p className="text-destructive font-medium">
            {row.original.distanceLabel}
          </p>
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="space-y-1">
          <Badge variant={RADIUS_REVIEW_VARIANT[row.original.status]}>
            {RADIUS_REVIEW_SHORT[row.original.status]}
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
        row.original.status === RadiusReviewStatus.PENDING ? (
          <Button
            variant="ghost"
            size="sm"
            title="Verifikasi"
            onClick={() => setTarget(row.original)}
          >
            <ShieldCheck className="size-4" />
            Verifikasi
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
        title="Cari"
        emptyMessage="Tidak ada absensi yang perlu diverifikasi."
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
            <DialogTitle>Verifikasi Absensi Luar Radius</DialogTitle>
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

          <div className="flex flex-col gap-2">
            <Label>Keputusan</Label>
            <div className="grid gap-2">
              {RADIUS_DECISION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDecision(option)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    decision === option
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <p className="text-sm font-medium">
                    {RADIUS_REVIEW_LABEL[option]}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {RADIUS_DECISION_HINT[option]}
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
              placeholder="Contoh: sedang tugas luar, sudah dikonfirmasi atasan"
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
            <Button onClick={confirmReview} disabled={submitting}>
              {submitting && <Spinner />}
              Simpan Keputusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
