"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@/components/mobile/icon";
import { ReviewNoteDrawer } from "@/components/mobile/approval/review-note-drawer";

/** Mirrors mobile's `ApprovalActions` — Setujui/Tolak buttons + note drawer for a pending card. */
export function ApprovalActions({
  onApprove,
  onReject,
  submitting = false,
}: {
  onApprove: (note: string) => void;
  onReject: (note: string) => void;
  submitting?: boolean;
}) {
  const [drawer, setDrawer] = useState<"approve" | "reject" | null>(null);

  function handleConfirm(note: string) {
    if (drawer === "approve") onApprove(note);
    else if (drawer === "reject") onReject(note);
    setDrawer(null);
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDrawer("reject")}
          className="border-destructive text-destructive flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium"
        >
          <Icon icon={X} size={16} tone="destructive" />
          Tolak
        </button>

        <button
          type="button"
          onClick={() => setDrawer("approve")}
          className="bg-primary text-primary-foreground flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium"
        >
          <Icon icon={Check} size={16} tone="inverse" />
          Setujui
        </button>
      </div>

      <ReviewNoteDrawer
        open={drawer !== null}
        title={drawer === "approve" ? "Setujui pengajuan?" : "Tolak pengajuan?"}
        confirmLabel={drawer === "approve" ? "Setujui" : "Tolak"}
        destructive={drawer === "reject"}
        submitting={submitting}
        onClose={() => setDrawer(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

/** Toast after an approval action succeeds/fails — mirrors mobile's `showApprovalResult` Alert. */
export function showApprovalResult(
  result: { ok: true; message: string } | { ok: false; error: string },
) {
  if (result.ok) toast.success(result.message);
  else toast.error(result.error);
}
