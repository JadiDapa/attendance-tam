"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormInput, FormTextarea } from "@/components/mobile/form-input";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { upsertContact } from "@/app/action/employee-profile.action";
import type { ApiContact } from "@/lib/mobile-queries";

/** Mirrors mobile's `employee-data-contact.tsx`. */
export function ContactForm({ initial }: { initial: ApiContact | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [domicileAddress, setDomicileAddress] = useState(
    initial?.domicileAddress ?? "",
  );
  const [ktpAddress, setKtpAddress] = useState(initial?.ktpAddress ?? "");
  const [emergencyContactName, setEmergencyContactName] = useState(
    initial?.emergencyContactName ?? "",
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    initial?.emergencyContactRelation ?? "",
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initial?.emergencyContactPhone ?? "",
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await upsertContact({
        domicileAddress,
        ktpAddress,
        emergencyContactName,
        emergencyContactRelation,
        emergencyContactPhone,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      router.back();
    });
  }

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader title="Kontak" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Alamat Domisili
          </span>
          <FormTextarea
            value={domicileAddress}
            onChange={(e) => setDomicileAddress(e.target.value)}
            placeholder="Alamat tempat tinggal saat ini"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Alamat KTP
          </span>
          <FormTextarea
            value={ktpAddress}
            onChange={(e) => setKtpAddress(e.target.value)}
            placeholder="Alamat sesuai KTP"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Nama Kontak Darurat
          </span>
          <FormInput
            value={emergencyContactName}
            onChange={(e) => setEmergencyContactName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Hubungan Keluarga
          </span>
          <FormInput
            value={emergencyContactRelation}
            onChange={(e) => setEmergencyContactRelation(e.target.value)}
            placeholder="Contoh: Orang Tua, Saudara"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Nomor Telepon Kontak Darurat
          </span>
          <FormInput
            value={emergencyContactPhone}
            onChange={(e) => setEmergencyContactPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            inputMode="tel"
          />
        </div>

        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        )}

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
