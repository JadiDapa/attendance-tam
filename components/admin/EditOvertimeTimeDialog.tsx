"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil1Icon as Pencil } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateOvertimeTime } from "@/app/action/overtime.action";

/**
 * Admin mengoreksi jam mulai/selesai lembur. Status approval tidak berubah —
 * hanya jam dan durasinya. Alasannya wajib, jam asli tetap tersimpan.
 */
export default function EditOvertimeTimeDialog({
  overtimeId,
  employeeName,
  startTime,
  endTime,
}: {
  overtimeId: string;
  employeeName: string;
  /** "HH:mm" */
  startTime: string;
  /** "HH:mm" — null kalau lembur masih berjalan. */
  endTime: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime ?? "");
  const [editNote, setEditNote] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (next) {
      setStart(startTime);
      setEnd(endTime ?? "");
      setEditNote("");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await updateOvertimeTime(overtimeId, {
      startTime: start,
      endTime: end,
      editNote,
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="size-4" />
          Ubah Jam
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Jam Lembur</DialogTitle>
          <DialogDescription>
            {employeeName}. Status persetujuan tidak berubah; jam asli tetap
            tersimpan. Jam selesai yang lebih awal dari jam mulai dihitung
            melewati tengah malam.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={`otStart-${overtimeId}`}>Jam mulai</Label>
            <Input
              id={`otStart-${overtimeId}`}
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`otEnd-${overtimeId}`}>Jam selesai</Label>
            <Input
              id={`otEnd-${overtimeId}`}
              type="time"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`otNote-${overtimeId}`}>Alasan perubahan</Label>
          <Textarea
            id={`otNote-${overtimeId}`}
            rows={2}
            value={editNote}
            onChange={(event) => setEditNote(event.target.value)}
            maxLength={300}
            placeholder="Contoh: karyawan lupa menyelesaikan lembur di aplikasi"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !start || !editNote.trim()}
          >
            {submitting && <Spinner />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
