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
import { createAdminCorrection } from "@/app/action/correction.action";
import {
  AdminCorrectionSchema,
  type AdminCorrectionInput,
} from "@/servers/validators/correction.validator";

export type EmployeeOption = { id: string; name: string; position: string };

export default function AdminCorrectionDialog({
  employees,
  today,
}: {
  employees: EmployeeOption[];
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaultValues: AdminCorrectionInput = {
    userId: "",
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
  } = useForm<AdminCorrectionInput>({
    resolver: zodResolver(AdminCorrectionSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await createAdminCorrection(values);

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
          Catat Absensi
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat Absensi Manual</DialogTitle>
          <DialogDescription>
            Untuk absensi yang gagal tercatat di lapangan. Langsung berlaku
            tanpa review, dan tersimpan atas nama kamu sebagai yang mencatat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="userId">Karyawan</Label>
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="userId" className="w-full">
                    <SelectValue placeholder="Pilih karyawan" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                        {employee.position ? ` · ${employee.position}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.userId && (
              <p className="text-destructive text-sm">
                {errors.userId.message}
              </p>
            )}
          </div>

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
              <Label htmlFor="requestedTime">Jam</Label>
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
            <Label htmlFor="type">Jenis absensi</Label>
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
            <Label htmlFor="reason">Alasan koreksi</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Contoh: lapor lewat WhatsApp, HP rusak sejak pagi"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-destructive text-sm">
                {errors.reason.message}
              </p>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            Kalau absensi pada slot itu sudah ada, jamnya diperbarui dan
            barisnya ditandai sebagai pencatatan manual.
          </p>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Catat Absensi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
