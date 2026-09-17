"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormInput } from "@/components/mobile/form-input";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { upsertWorkHistory } from "@/app/action/employee-profile.action";
import type { ApiWorkHistory } from "@/lib/mobile-queries";

/** Mirrors mobile's `employee-data-work-history.tsx` — all fields optional. */
export function WorkHistoryForm({
  initial,
}: {
  initial: ApiWorkHistory | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [previousCompany, setPreviousCompany] = useState(
    initial?.previousCompany ?? "",
  );
  const [previousPosition, setPreviousPosition] = useState(
    initial?.previousPosition ?? "",
  );
  const [previousDuration, setPreviousDuration] = useState(
    initial?.previousDuration ?? "",
  );

  function handleSubmit() {
    startTransition(async () => {
      const result = await upsertWorkHistory({
        previousCompany,
        previousPosition,
        previousDuration,
      });
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
      <MobilePageHeader title="Riwayat Pekerjaan" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Perusahaan Sebelumnya
          </span>
          <FormInput
            value={previousCompany}
            onChange={(e) => setPreviousCompany(e.target.value)}
            placeholder="Contoh: PT Sejahtera Abadi"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Posisi Sebelumnya
          </span>
          <FormInput
            value={previousPosition}
            onChange={(e) => setPreviousPosition(e.target.value)}
            placeholder="Contoh: Staff Administrasi"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Lama Bekerja
          </span>
          <FormInput
            value={previousDuration}
            onChange={(e) => setPreviousDuration(e.target.value)}
            placeholder="Contoh: 2 tahun 3 bulan"
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
