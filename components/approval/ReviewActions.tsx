"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

type ReviewStatus = "APPROVED" | "REJECTED";

type ReviewResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Tombol Setujui/Tolak + dialog catatan, dipakai di halaman detail izin,
 * lembur, dan dinas luar — ketiganya memanggil server action dengan
 * signature `(id, { status, reviewNote }) => Result` yang sama persis.
 */
export default function ReviewActions({
  id,
  entityLabel,
  subtitle,
  reviewAction,
  redirectTo,
  approvePlaceholder = "Contoh: disetujui",
  rejectPlaceholder = "Contoh: tidak dapat disetujui",
}: {
  id: string;
  entityLabel: string;
  subtitle: string;
  reviewAction: (
    id: string,
    input: { status: ReviewStatus; reviewNote: string },
  ) => Promise<ReviewResult>;
  redirectTo: string;
  approvePlaceholder?: string;
  rejectPlaceholder?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const closeDialog = () => {
    setStatus(null);
    setNote("");
  };

  const confirmReview = async () => {
    if (!status) return;

    setSubmitting(true);

    const result = await reviewAction(id, { status, reviewNote: note });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    closeDialog();
    router.push(redirectTo);
  };

  const isApprove = status === "APPROVED";

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={() => setStatus("APPROVED")}>Setujui</Button>
        <Button variant="destructive" onClick={() => setStatus("REJECTED")}>
          Tolak
        </Button>
      </div>

      <Dialog
        open={status !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isApprove ? `Setujui ${entityLabel}` : `Tolak ${entityLabel}`}
            </DialogTitle>
            <DialogDescription>{subtitle}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reviewNote">Catatan (opsional)</Label>
            <Textarea
              id="reviewNote"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={isApprove ? approvePlaceholder : rejectPlaceholder}
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
