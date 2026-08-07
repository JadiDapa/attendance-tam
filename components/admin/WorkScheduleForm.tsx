"use client";

import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CalendarClock, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { saveWorkSchedule } from "@/app/action/setting.action";
import { DAY_LABEL, summarizeWeek } from "@/lib/work-schedule";
import { cn } from "@/lib/utils";
import {
  WorkScheduleSchema,
  type WorkScheduleDTO,
  type WorkScheduleInput,
} from "@/servers/validators/setting.validator";

export default function WorkScheduleForm({
  defaultValues,
}: {
  defaultValues: WorkScheduleDTO;
}) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<WorkScheduleInput, unknown, WorkScheduleDTO>({
    resolver: zodResolver(WorkScheduleSchema),
    defaultValues,
  });

  // `days` sudah urut Senin→Minggu dari server, jadi indeks array = urutan tampil.
  const { fields } = useFieldArray({ control, name: "days" });
  const days = useWatch({ control, name: "days" });

  const summary = summarizeWeek(
    (days ?? []).map((day) => ({
      dayOfWeek: Number(day.dayOfWeek),
      isWorkingDay: Boolean(day.isWorkingDay),
      checkInTime: day.checkInTime,
      checkOutTime: day.checkOutTime,
    })),
  );

  /** Salin jam hari kerja pertama ke semua hari kerja lain. */
  const applyToAll = () => {
    const source = (days ?? []).find((day) => day.isWorkingDay);

    if (!source) {
      toast.error("Aktifkan minimal satu hari kerja dulu");
      return;
    }

    (days ?? []).forEach((day, index) => {
      if (!day.isWorkingDay) return;

      setValue(`days.${index}.checkInTime`, source.checkInTime, {
        shouldValidate: true,
      });
      setValue(`days.${index}.checkOutTime`, source.checkOutTime, {
        shouldValidate: true,
      });
    });

    toast.success(
      `Semua hari kerja disamakan ke ${source.checkInTime}–${source.checkOutTime}`,
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveWorkSchedule(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {fields.map((field, index) => {
          const day = days?.[index];
          const isWorking = Boolean(day?.isWorkingDay);
          const dayError = errors.days?.[index];

          return (
            <div
              key={field.id}
              className={cn(
                "border-border flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border p-3 transition-colors",
                !isWorking && "bg-muted/40",
              )}
            >
              {/* Hari tidak bisa diubah dari UI, tapi harus ikut terkirim. */}
              <input
                type="hidden"
                {...register(`days.${index}.dayOfWeek`, { valueAsNumber: true })}
              />

              <Controller
                control={control}
                name={`days.${index}.isWorkingDay`}
                render={({ field: toggle }) => (
                  <Switch
                    checked={toggle.value}
                    onCheckedChange={toggle.onChange}
                    aria-label={`Hari kerja ${DAY_LABEL[Number(day?.dayOfWeek ?? 0)]}`}
                  />
                )}
              />

              <span
                className={cn(
                  "w-20 text-sm font-medium",
                  !isWorking && "text-muted-foreground",
                )}
              >
                {DAY_LABEL[Number(day?.dayOfWeek ?? 0)]}
              </span>

              {isWorking ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="time"
                    className="w-32"
                    aria-label="Jam masuk"
                    {...register(`days.${index}.checkInTime`)}
                  />
                  <span className="text-muted-foreground text-sm">–</span>
                  <Input
                    type="time"
                    className="w-32"
                    aria-label="Jam pulang"
                    {...register(`days.${index}.checkOutTime`)}
                  />
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Libur</span>
              )}

              {(dayError?.checkInTime || dayError?.checkOutTime) && (
                <p className="text-destructive w-full text-sm">
                  {dayError.checkOutTime?.message ??
                    dayError.checkInTime?.message}
                </p>
              )}
            </div>
          );
        })}

        {errors.days?.root && (
          <p className="text-destructive text-sm">{errors.days.root.message}</p>
        )}
        {errors.days?.message && (
          <p className="text-destructive text-sm">{errors.days.message}</p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={applyToAll}
      >
        <Copy className="size-4" />
        Samakan semua hari kerja
      </Button>

      <div className="flex flex-col gap-2">
        <Label htmlFor="lateToleranceMinutes">Toleransi telat (menit)</Label>
        <Input
          id="lateToleranceMinutes"
          type="number"
          min={0}
          max={180}
          className="w-32"
          {...register("lateToleranceMinutes")}
        />
        <p className="text-muted-foreground text-xs">
          Berlaku sama untuk semua hari. Absen masuk setelah jam masuk +
          toleransi ditandai terlambat.
        </p>
        {errors.lateToleranceMinutes && (
          <p className="text-destructive text-sm">
            {errors.lateToleranceMinutes.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="maxAccuracyMeters">Akurasi GPS maksimal (meter)</Label>
        <Input
          id="maxAccuracyMeters"
          type="number"
          min={10}
          max={5000}
          className="w-32"
          {...register("maxAccuracyMeters")}
        />
        <p className="text-muted-foreground text-xs">
          Absensi ditolak kalau perangkat melaporkan akurasi lebih buruk dari
          ini — pembacaan kasar bikin jarak ke kantor tidak bermakna. Naikkan
          kalau karyawan sering gagal absen di dalam gedung.
        </p>
        {errors.maxAccuracyMeters && (
          <p className="text-destructive text-sm">
            {errors.maxAccuracyMeters.message}
          </p>
        )}
      </div>

      <div className="border-border bg-muted/40 flex items-start gap-2.5 rounded-xl border p-3 text-sm">
        <CalendarClock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">{summary.scheduleLabel}</p>
          <p className="text-muted-foreground text-xs">
            {summary.workingDays} hari kerja · total {summary.totalLabel} per
            minggu
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting && <Spinner />}
        Simpan Waktu Kerja
      </Button>
    </form>
  );
}
