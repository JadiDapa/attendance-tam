"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormTextarea } from "@/components/mobile/form-input";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { upsertTraining } from "@/app/action/employee-profile.action";
import type { ApiTraining } from "@/lib/mobile-queries";

/** Mirrors mobile's `employee-data-training.tsx` — single free-text field. */
export function TrainingForm({ initial }: { initial: ApiTraining | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trainingHistory, setTrainingHistory] = useState(
    initial?.trainingHistory ?? "",
  );

  function handleSubmit() {
    startTransition(async () => {
      const result = await upsertTraining({ trainingHistory });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.back();
    });
  }

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Pelatihan" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Riwayat Training/Seminar/Sertifikasi
          </span>
          <FormTextarea
            value={trainingHistory}
            onChange={(e) => setTrainingHistory(e.target.value)}
            placeholder="Contoh: Pelatihan K3 tahun 2025, Sertifikasi PMP tahun 2024"
            rows={6}
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-primary text-primary-foreground mt-2 rounded-xl py-3.5 text-center font-medium disabled:opacity-60"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}
