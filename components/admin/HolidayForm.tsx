"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarIcon as CalendarOff } from "@radix-ui/react-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import Panel from "@/components/dashboard/Panel";
import { HolidayType } from "@/generated/prisma";
import { formatWorkDate, fromDateInputValue } from "@/lib/date";
import { HOLIDAY_TYPE_LABEL, HOLIDAY_TYPE_VARIANT } from "@/lib/holiday";
import { saveHoliday } from "@/app/action/holiday.action";
import {
  HolidayFormSchema,
  type HolidayFormInput,
} from "@/servers/validators/holiday.validator";

type Props = {
  /** Diisi kalau form dipakai untuk mengubah hari libur yang sudah ada. */
  holiday?: {
    id: string;
    date: string;
    name: string;
    type: HolidayType;
  };
};

export default function HolidayForm({ holiday }: Props) {
  const router = useRouter();
  const isEdit = Boolean(holiday);

  const defaultValues: HolidayFormInput = {
    date: holiday?.date ?? "",
    name: holiday?.name ?? "",
    type: holiday?.type ?? HolidayType.NASIONAL,
  };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<HolidayFormInput>({
    resolver: zodResolver(HolidayFormSchema),
    defaultValues,
  });

  const values = useWatch({ control });
  const parsedDate = values.date ? fromDateInputValue(values.date) : null;
  const type = values.type ?? HolidayType.NASIONAL;

  const onSubmit = handleSubmit(async (formValues) => {
    const result = await saveHoliday(formValues, holiday?.id);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.push("/admin/hari-libur");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        <Panel
          title="Detail Hari Libur"
          icon={CalendarOff}
          contentClassName="flex flex-col gap-4 p-4 sm:p-5"
        >
          <p className="text-muted-foreground -mt-1 text-sm">
            Tanggal ini tidak dihitung sebagai hari kerja: karyawan tidak wajib
            absen dan tidak muncul sebagai tidak absen di rekap.
          </p>

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
        </Panel>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <Panel
          title="Ringkasan"
          icon={CalendarOff}
          contentClassName="flex flex-col gap-4 p-4 sm:p-5"
        >
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Tanggal</dt>
              <dd className="font-medium">
                {parsedDate ? formatWorkDate(parsedDate) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Nama</dt>
              <dd className="max-w-[60%] truncate text-right font-medium">
                {values.name || "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Jenis</dt>
              <dd>
                <Badge variant={HOLIDAY_TYPE_VARIANT[type]}>
                  {HOLIDAY_TYPE_LABEL[type]}
                </Badge>
              </dd>
            </div>
          </dl>

          <Separator />

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Spinner />}
              {isEdit ? "Simpan Perubahan" : "Tambah Hari Libur"}
            </Button>
            <Button asChild type="button" variant="outline" className="w-full">
              <Link href="/admin/hari-libur">Batal</Link>
            </Button>
          </div>
        </Panel>
      </div>
    </form>
  );
}
