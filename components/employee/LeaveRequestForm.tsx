"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import {
  LEAVE_REASON_CATEGORIES_BY_TYPE,
  LEAVE_REASON_CATEGORY_LABEL,
  LEAVE_TYPE_LABEL,
  LEAVE_TYPES_REQUIRING_ATTACHMENT,
  defaultCutiStartDate,
  minCutiStartDateInputValue,
} from "@/lib/leave";
import { formatWorkDate, fromDateInputValue } from "@/lib/date";
import { toDateInputValue } from "@/lib/date";
import {
  LeaveFormSchema,
  type LeaveFormDTO,
} from "@/servers/validators/leave.validator";

export default function LeaveRequestForm({ today }: { today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LeaveFormDTO>({
    resolver: zodResolver(LeaveFormSchema),
    defaultValues: {
      type: LeaveType.IZIN,
      startDate: today,
      endDate: today,
      detail: "",
      reasonCategory: undefined,
    },
  });

  const type = useWatch({ control, name: "type" });
  const attachmentRequired = LEAVE_TYPES_REQUIRING_ATTACHMENT.includes(type);
  const cutiMinDate = minCutiStartDateInputValue();
  const reasonCategories = LEAVE_REASON_CATEGORIES_BY_TYPE[type];
  const submissionDateLabel = (() => {
    const parsed = fromDateInputValue(today);
    return parsed ? formatWorkDate(parsed) : today;
  })();

  const onSubmit = handleSubmit(async (values) => {
    if (LEAVE_TYPES_REQUIRING_ATTACHMENT.includes(values.type) && !attachment) {
      setAttachmentError(
        "Lampiran wajib untuk pengajuan sakit — surat keterangan dokter atau keterangan lainnya",
      );
      return;
    }

    setAttachmentError(null);

    const formData = new FormData();
    formData.set("type", values.type);
    formData.set("startDate", values.startDate);
    formData.set("endDate", values.endDate);
    formData.set("detail", values.detail);
    if (values.reasonCategory) {
      formData.set("reasonCategory", values.reasonCategory);
    }

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
          setAttachmentError(null);
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
                <Select
                  value={field.value}
                  onValueChange={(next) => {
                    field.onChange(next);

                    // Kategori "Alasan" berbeda per jenis izin (dan SAKIT
                    // tidak punya kategori sama sekali) — selalu reset supaya
                    // tidak ada pilihan lama yang lolos tidak sesuai jenis.
                    setValue("reasonCategory", undefined);

                    // Cuti minimal H-30 — langsung arahkan ke tanggal 1 bulan
                    // depan (atau lebih jauh kalau bulan depan masih < 30
                    // hari) supaya user tidak perlu geser kalender manual.
                    if (next === LeaveType.CUTI) {
                      const defaultStart = toDateInputValue(
                        defaultCutiStartDate(),
                      );
                      setValue("startDate", defaultStart);
                      setValue("endDate", defaultStart);
                    }
                  }}
                >
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

          {type === LeaveType.CUTI && (
            <p className="text-muted-foreground -mt-2 text-xs">
              Cuti wajib diajukan minimal 30 hari sebelum tanggal mulai — 30
              hari ke depan dari hari ini tidak bisa dipilih.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label>Tanggal Pengajuan</Label>
            <p className="text-muted-foreground text-sm">
              {submissionDateLabel}
            </p>
          </div>

          {reasonCategories && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="reasonCategory">Alasan</Label>
              <Controller
                control={control}
                name="reasonCategory"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(next) => field.onChange(next)}
                  >
                    <SelectTrigger id="reasonCategory" className="w-full">
                      <SelectValue placeholder="Pilih alasan" />
                    </SelectTrigger>
                    <SelectContent>
                      {reasonCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {LEAVE_REASON_CATEGORY_LABEL[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.reasonCategory && (
                <p className="text-destructive text-sm">
                  {errors.reasonCategory.message}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Mulai</Label>
              <Input
                id="startDate"
                type="date"
                min={type === LeaveType.CUTI ? cutiMinDate : undefined}
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-destructive text-sm">
                  {errors.startDate.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">Selesai</Label>
              <Input
                id="endDate"
                type="date"
                min={type === LeaveType.CUTI ? cutiMinDate : undefined}
                {...register("endDate")}
              />
              {errors.endDate && (
                <p className="text-destructive text-sm">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="detail">Detail</Label>
            <Textarea
              id="detail"
              rows={3}
              placeholder="Contoh: demam dan perlu istirahat"
              {...register("detail")}
            />
            {errors.detail && (
              <p className="text-destructive text-sm">
                {errors.detail.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attachment">
              {type === LeaveType.SAKIT
                ? "Upload Surat Keterangan Dokter"
                : "Lampiran"}{" "}
              {attachmentRequired ? "(wajib)" : "(opsional)"}
            </Label>
            <Input
              id="attachment"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                setAttachment(event.target.files?.[0] ?? null);
                if (attachmentError) setAttachmentError(null);
              }}
            />
            <p className="text-muted-foreground text-xs">
              {type === LeaveType.SAKIT
                ? "Wajib lampirkan surat keterangan dokter — JPG, PNG, WEBP, atau PDF, maks 5MB."
                : "Surat dokter atau bukti pendukung — JPG, PNG, WEBP, atau PDF, maks 5MB."}
            </p>
            {attachmentError && (
              <p className="text-destructive text-sm">{attachmentError}</p>
            )}
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
