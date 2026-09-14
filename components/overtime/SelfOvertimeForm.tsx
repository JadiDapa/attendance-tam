"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon as Plus } from "@radix-ui/react-icons";
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
import { startOvertime } from "@/app/action/overtime.action";
import {
  StartOvertimeSchema,
  type StartOvertimeDTO,
} from "@/servers/validators/overtime.validator";

export default function SelfOvertimeForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StartOvertimeDTO>({
    resolver: zodResolver(StartOvertimeSchema),
    defaultValues: { startTime: "18:00", reason: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await startOvertime(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setOpen(false);
    router.refresh();
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Mulai Lembur
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mulai Lembur</DialogTitle>
          <DialogDescription>
            Absen pulang hari ini harus sudah tercatat. Lembur hanya bisa
            dimulai pukul 18:00 atau lebih larut.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="startTime">Jam Mulai</Label>
            <Input
              id="startTime"
              type="time"
              min="18:00"
              max="23:59"
              {...register("startTime")}
            />
            {errors.startTime && (
              <p className="text-destructive text-sm">
                {errors.startTime.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Contoh: menyelesaikan laporan bulanan"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-destructive text-sm">
                {errors.reason.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Mulai Lembur
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
