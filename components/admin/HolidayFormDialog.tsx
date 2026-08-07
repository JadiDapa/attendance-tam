"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { HolidayType } from "@/generated/prisma";
import { HOLIDAY_TYPE_LABEL } from "@/lib/holiday";
import { saveHoliday } from "@/app/action/holiday.action";
import {
  HolidayFormSchema,
  type HolidayFormInput,
} from "@/servers/validators/holiday.validator";

type Props = {
  trigger: ReactNode;
  /** Diisi kalau dialog dipakai untuk mengubah hari libur yang sudah ada. */
  holiday?: {
    id: string;
    date: string;
    name: string;
    type: HolidayType;
  };
};

export default function HolidayFormDialog({ trigger, holiday }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaultValues: HolidayFormInput = {
    date: holiday?.date ?? "",
    name: holiday?.name ?? "",
    type: holiday?.type ?? HolidayType.NASIONAL,
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayFormInput>({
    resolver: zodResolver(HolidayFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveHoliday(values, holiday?.id);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setOpen(false);
    reset(holiday ? values : defaultValues);
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {holiday ? "Ubah Hari Libur" : "Tambah Hari Libur"}
          </DialogTitle>
          <DialogDescription>
            Tanggal ini tidak dihitung sebagai hari kerja: karyawan tidak wajib
            absen dan tidak muncul sebagai tidak absen di rekap.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="date">Tanggal</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-destructive text-sm">{errors.date.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nama libur</Label>
            <Input
              id="name"
              placeholder="Contoh: Hari Raya Idul Fitri"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

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
                    {Object.values(HolidayType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {HOLIDAY_TYPE_LABEL[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
