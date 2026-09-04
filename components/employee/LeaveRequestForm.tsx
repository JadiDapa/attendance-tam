"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { LeaveType } from "@/generated/prisma";
import { createLeaveRequest } from "@/app/action/leave.action";
import { LEAVE_TYPE_LABEL } from "@/lib/leave";
import {
  LeaveFormSchema,
  type LeaveFormDTO,
} from "@/servers/validators/leave.validator";

export default function LeaveRequestForm({ today }: { today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormDTO>({
    resolver: zodResolver(LeaveFormSchema),
    defaultValues: {
      type: LeaveType.IZIN,
      startDate: today,
      endDate: today,
      reason: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const formData = new FormData();
    formData.set("type", values.type);
    formData.set("startDate", values.startDate);
    formData.set("endDate", values.endDate);
    formData.set("reason", values.reason);

    if (attachment) formData.set("attachment", attachment);

    const result = await createLeaveRequest(formData);

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

        if (!next) {
          reset();
          setAttachment(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          Ajukan Izin
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pengajuan Izin / Cuti</DialogTitle>
          <DialogDescription>
            Pengajuan akan berstatus menunggu sampai disetujui admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Jenis</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeaveType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {LEAVE_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Mulai</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-destructive text-sm">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">Selesai</Label>
              <Input id="endDate" type="date" {...register("endDate")} />
              {errors.endDate && (
                <p className="text-destructive text-sm">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Alasan</Label>
            <Textarea
              id="reason"
              rows={3}
              placeholder="Contoh: demam dan perlu istirahat"
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-destructive text-sm">
                {errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attachment">Lampiran (opsional)</Label>
            <Input
              id="attachment"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) =>
                setAttachment(event.target.files?.[0] ?? null)
              }
            />
            <p className="text-muted-foreground text-xs">
              Surat dokter atau bukti pendukung — JPG, PNG, WEBP, atau PDF, maks
              5MB.
            </p>
          </div>

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
