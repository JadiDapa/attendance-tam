"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { upsertTraining } from "@/app/action/employee-profile.action";
import {
  TrainingSchema,
  type TrainingInput,
} from "@/servers/validators/employee-profile.validator";

type Props = {
  initial: { trainingHistory: string };
  targetUserId?: string;
};

export default function TrainingForm({ initial, targetUserId }: Props) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TrainingInput>({
    resolver: zodResolver(TrainingSchema),
    defaultValues: initial,
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await upsertTraining(values, targetUserId);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="trainingHistory">Riwayat Training / Seminar / Sertifikasi</Label>
        <Textarea
          id="trainingHistory"
          rows={4}
          placeholder="Contoh: Pelatihan K3 (2024), Sertifikasi Manajemen Proyek (2025)"
          {...register("trainingHistory")}
        />
        {errors.trainingHistory && (
          <p className="text-destructive text-sm">
            {errors.trainingHistory.message}
          </p>
        )}
      </div>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Simpan
        </Button>
      </div>
    </form>
  );
}
