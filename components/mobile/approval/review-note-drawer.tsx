"use client";

import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/** Mirrors mobile's `ReviewNoteDrawer` — optional note before approve/reject. */
export function ReviewNoteDrawer({
  open,
  title,
  confirmLabel,
  destructive = false,
  submitting = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  destructive?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
}) {
  const [note, setNote] = useState("");

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
        else setNote("");
      }}
    >
      <DrawerContent className="md:hidden">
        <div className="flex flex-col gap-3 p-2 pb-4">
          <h2 className="text-foreground text-center text-base font-bold">
            {title}
          </h2>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan (opsional)"
            rows={3}
            className="bg-muted text-foreground min-h-20 rounded-xl p-3 text-sm"
          />

          <button
            type="button"
            disabled={submitting}
            onClick={() => onConfirm(note.trim())}
            className={cn(
              "text-primary-foreground rounded-xl py-3.5 text-center font-medium",
              destructive ? "bg-destructive" : "bg-primary",
              submitting && "opacity-60",
            )}
          >
            {submitting ? "Memproses..." : confirmLabel}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="text-muted-foreground rounded-xl py-3 text-center text-sm"
          >
            Batal
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
