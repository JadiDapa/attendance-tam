"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ClockIcon as Clock4 } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { endOvertime } from "@/app/action/overtime.action";
import {
  EndOvertimeSchema,
  type EndOvertimeDTO,
} from "@/servers/validators/overtime.validator";

export default function SelfOvertimeActiveCard({
  dateLabel,
  startTime,
  reason,
}: {
  dateLabel: string;
  startTime: string;
  reason: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EndOvertimeDTO>({
    resolver: zodResolver(EndOvertimeSchema),
    defaultValues: { endTime: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    const result = await endOvertime(values);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <div className="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <Clock4 className="text-primary-subtle size-4" />
        <p className="text-sm font-medium">Lembur sedang berjalan</p>
      </div>

      <p className="text-muted-foreground text-sm">
        Mulai {dateLabel} pukul {startTime} — {reason}
      </p>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="endTime">Jam Selesai (kosongkan untuk sekarang)</Label>
          <Input id="endTime" type="time" {...register("endTime")} />
          {errors.endTime && (
            <p className="text-destructive text-sm">{errors.endTime.message}</p>
          )}
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting && <Spinner />}
          Selesaikan Lembur
        </Button>
      </form>
    </div>
  );
}
