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
import { updateAttendanceTime } from "@/app/action/attendance.action";

/**
 * Admin mengoreksi jam absen masuk/pulang yang sudah tercatat. Alasannya wajib
 * — jam asli tetap tersimpan di database, dan barisnya diberi label
 * "Diubah admin" supaya perubahan ini tidak pernah diam-diam.
 */
export default function EditAttendanceTimeDialog({
  attendanceId,
  employeeName,
  label,
  time,
}: {
  attendanceId: string;
  employeeName: string;
  /** "Absen Masuk" / "Absen Pulang". */
  label: string;
  /** Jam saat ini, "HH:mm". */
  time: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [value, setValue] = useState(time);
  const [editNote, setEditNote] = useState("");

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (next) {
      setValue(time);
      setEditNote("");
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await updateAttendanceTime(attendanceId, {
      time: value,
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
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={`Ubah jam ${label} ${employeeName}`}
        >
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Ubah Jam {label}</DialogTitle>
          <DialogDescription>
            {employeeName} · jam sekarang {time}. Jam asli tetap tersimpan dan
            barisnya ditandai &quot;Diubah admin&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`editTime-${attendanceId}`}>Jam baru</Label>
          <Input
            id={`editTime-${attendanceId}`}
            type="time"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`editNote-${attendanceId}`}>Alasan perubahan</Label>
          <Textarea
            id={`editNote-${attendanceId}`}
            rows={2}
            value={editNote}
            onChange={(event) => setEditNote(event.target.value)}
            maxLength={300}
            placeholder="Contoh: karyawan absen dari HP atasan karena HP-nya mati"
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
            disabled={submitting || !value || !editNote.trim()}
          >
            {submitting && <Spinner />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
