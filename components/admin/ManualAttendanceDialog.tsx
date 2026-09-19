"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil1Icon as PencilLine,
  PlusIcon as Plus,
} from "@radix-ui/react-icons";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceType } from "@/generated/prisma";
import { ATTENDANCE_TYPE_LABEL } from "@/lib/attendance";
import {
  APPROVAL_MODES,
  WORK_MODE_LABEL,
  type WorkModeValue,
} from "@/lib/work-mode";
import { createManualAttendance } from "@/app/action/attendance.action";

type Employee = { id: string; name: string };

/**
 * Admin menambahkan absen masuk/pulang untuk pengguna yang lupa absen atau
 * HP-nya mati. Barisnya ditandai "Ditambahkan admin". Tidak ada antrean
 * review: admin yang mencatat langsung bertanggung jawab, jadi alasannya wajib
 * diisi sebagai jejak.
 */
export default function ManualAttendanceDialog({
  employees,
  defaultDate,
  defaultUserId,
  defaultType = AttendanceType.CHECK_IN,
  compact = false,
}: {
  employees: Employee[];
  /** "YYYY-MM-DD" — tanggal yang sedang dilihat di halaman kehadiran. */
  defaultDate: string;
  defaultUserId?: string;
  defaultType?: AttendanceType;
  /** Tombol kecil "Tambah" untuk dipakai di dalam baris tabel. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState(defaultUserId ?? "");
  const [workDate, setWorkDate] = useState(defaultDate);
  const [type, setType] = useState<AttendanceType>(defaultType);
  const [time, setTime] = useState(
    defaultType === AttendanceType.CHECK_OUT ? "17:00" : "08:00",
  );
  const [workMode, setWorkMode] = useState<WorkModeValue>("HADIR_DIKANTOR");
  const [reviewNote, setReviewNote] = useState("");

  const resetState = () => {
    setUserId(defaultUserId ?? "");
    setWorkDate(defaultDate);
    setType(defaultType);
    setTime(defaultType === AttendanceType.CHECK_OUT ? "17:00" : "08:00");
    setWorkMode("HADIR_DIKANTOR");
    setReviewNote("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const result = await createManualAttendance({
      userId,
      workDate,
      type,
      time,
      workMode,
      reviewNote,
    });

    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    handleOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Plus className="size-3.5" />
            Tambah
          </Button>
        ) : (
          <Button variant="outline">
            <PencilLine className="size-4" />
            Tambah Absensi
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Absensi</DialogTitle>
          <DialogDescription>
            Untuk pengguna yang lupa absen atau HP-nya mati. Tidak ada foto dan
            GPS yang tersimpan — baris ini diberi label &quot;Ditambahkan
            admin&quot;.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="manualUserId">Pengguna</Label>
          <NativeSelect
            id="manualUserId"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">Pilih pengguna</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="manualDate">Tanggal</Label>
            <Input
              id="manualDate"
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manualTime">Jam</Label>
            <Input
              id="manualTime"
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="manualType">Jenis</Label>
            <NativeSelect
              id="manualType"
              value={type}
              onChange={(event) =>
                setType(event.target.value as AttendanceType)
              }
            >
              {Object.values(AttendanceType).map((option) => (
                <option key={option} value={option}>
                  {ATTENDANCE_TYPE_LABEL[option]}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="manualMode">Status kehadiran</Label>
            <NativeSelect
              id="manualMode"
              value={workMode}
              onChange={(event) =>
                setWorkMode(event.target.value as WorkModeValue)
              }
            >
              {APPROVAL_MODES.map((option) => (
                <option key={option} value={option}>
                  {WORK_MODE_LABEL[option]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="manualNote">Alasan penambahan</Label>
          <Textarea
            id="manualNote"
            rows={2}
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            maxLength={300}
            placeholder="Contoh: HP karyawan mati, sudah dikonfirmasi atasan"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !userId || !reviewNote.trim()}
          >
            {submitting && <Spinner />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
