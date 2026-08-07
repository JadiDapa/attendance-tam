"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { AttendanceType } from "@/generated/prisma";
import { ATTENDANCE_TYPE_LABEL } from "@/lib/correction";
import { createCorrectionRequest } from "@/app/action/correction.action";
import {
  CorrectionFormSchema,
  type CorrectionFormInput,
} from "@/servers/validators/correction.validator";

export default function CorrectionRequestForm({ today }: { today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaultValues: CorrectionFormInput = {
    workDate: today,
    type: AttendanceType.CHECK_OUT,
    requestedTime: "",
    reason: "",
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CorrectionFormInput>({
    resolver: zodResolver(CorrectionFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createCorrectionRequest(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setOpen(false);
    reset(defaultValues);
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Ajukan Koreksi
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pengajuan Koreksi Absensi</DialogTitle>
          <DialogDescription>
            Untuk absensi yang tidak sempat tercatat — lupa absen, HP mati, atau
            kamera bermasalah. Pengajuan menunggu persetujuan admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="workDate">Tanggal</Label>
              <Input
                id="workDate"
                type="date"
                max={today}
                {...register("workDate")}
              />
              {errors.workDate && (
                <p className="text-destructive text-sm">
                  {errors.workDate.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="requestedTime">Jam sebenarnya</Label>
              <Input
                id="requestedTime"
                type="time"
                {...register("requestedTime")}
              />
              {errors.requestedTime && (
                <p className="text-destructive text-sm">
                  {errors.requestedTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Absensi yang dikoreksi</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(AttendanceType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {ATTENDANCE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Contoh: baterai HP habis sebelum sempat absen pulang"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-destructive text-sm">
                {errors.reason.message}
              </p>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Koreksi tidak menyimpan foto dan lokasi, jadi absensinya akan
            ditandai sebagai pencatatan manual.
          </p>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
