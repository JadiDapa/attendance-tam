"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, ChevronDown, Paperclip } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { FormInput } from "@/components/mobile/form-input";
import { OptionDrawer } from "@/components/mobile/option-drawer";
import { SingleDatePicker } from "@/components/mobile/single-date-picker";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { upsertPersonalIdentity } from "@/app/action/employee-profile.action";
import {
  GENDER_LABEL,
  RELIGION_LABEL,
  MARITAL_STATUS_LABEL,
} from "@/lib/employee-profile";
import type { ApiPersonalIdentity } from "@/lib/mobile-queries";
import type { Gender, Religion, MaritalStatus } from "@/generated/prisma";

const GENDER_OPTIONS = Object.keys(GENDER_LABEL) as Gender[];
const RELIGION_OPTIONS = Object.keys(RELIGION_LABEL) as Religion[];
const MARITAL_STATUS_OPTIONS = Object.keys(
  MARITAL_STATUS_LABEL,
) as MaritalStatus[];

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Mirrors mobile's `employee-data-identity.tsx`. */
export function IdentityForm({
  initial,
}: {
  initial: ApiPersonalIdentity | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nik, setNik] = useState(initial?.nik ?? "");
  const [placeOfBirth, setPlaceOfBirth] = useState(initial?.placeOfBirth ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    initial?.dateOfBirth?.slice(0, 10) ?? "",
  );
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [gender, setGender] = useState<Gender | null>(initial?.gender ?? null);
  const [isGenderPickerOpen, setGenderPickerOpen] = useState(false);
  const [religion, setReligion] = useState<Religion | null>(
    (initial?.religion as Religion) ?? null,
  );
  const [isReligionPickerOpen, setReligionPickerOpen] = useState(false);
  const [maritalStatus, setMaritalStatus] = useState<MaritalStatus | null>(
    (initial?.maritalStatus as MaritalStatus) ?? null,
  );
  const [isMaritalPickerOpen, setMaritalPickerOpen] = useState(false);
  const [nationality, setNationality] = useState(
    initial?.nationality ?? "Indonesia",
  );
  const [ktpPhoto, setKtpPhoto] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);

    if (!/^\d{16}$/.test(nik.trim())) {
      setError("NIK harus 16 digit angka");
      return;
    }
    if (
      !placeOfBirth.trim() ||
      !dateOfBirth ||
      !gender ||
      !religion ||
      !maritalStatus
    ) {
      setError("Semua field wajib diisi");
      return;
    }

    const formData = new FormData();
    formData.append("nik", nik.trim());
    formData.append("placeOfBirth", placeOfBirth.trim());
    formData.append("dateOfBirth", dateOfBirth);
    formData.append("gender", gender);
    formData.append("religion", religion);
    formData.append("maritalStatus", maritalStatus);
    formData.append("nationality", nationality.trim() || "Indonesia");
    if (ktpPhoto) formData.append("ktpPhoto", ktpPhoto);

    startTransition(async () => {
      const result = await upsertPersonalIdentity(formData);
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
      <MobilePageHeader title="Identitas Pribadi" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">NIK</span>
          <FormInput
            value={nik}
            onChange={(e) => setNik(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="16 digit NIK"
            inputMode="numeric"
            maxLength={16}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Tempat Lahir
          </span>
          <FormInput
            value={placeOfBirth}
            onChange={(e) => setPlaceOfBirth(e.target.value)}
            placeholder="Contoh: Jakarta"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Tanggal Lahir
          </span>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="bg-muted flex items-center gap-2 rounded-xl px-4 py-3 text-left"
          >
            <Icon icon={Calendar} size={18} tone="muted" />
            <span className="text-foreground text-sm">
              {dateOfBirth ? formatShortDate(dateOfBirth) : "Pilih tanggal..."}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Jenis Kelamin
          </span>
          <button
            type="button"
            onClick={() => setGenderPickerOpen(true)}
            className="bg-muted flex items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <span className="text-foreground text-sm">
              {gender ? GENDER_LABEL[gender] : "Pilih jenis kelamin..."}
            </span>
            <Icon icon={ChevronDown} size={16} tone="primary" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">Agama</span>
          <button
            type="button"
            onClick={() => setReligionPickerOpen(true)}
            className="bg-muted flex items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <span className="text-foreground text-sm">
              {religion ? RELIGION_LABEL[religion] : "Pilih agama..."}
            </span>
            <Icon icon={ChevronDown} size={16} tone="primary" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Status Pernikahan
          </span>
          <button
            type="button"
            onClick={() => setMaritalPickerOpen(true)}
            className="bg-muted flex items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <span className="text-foreground text-sm">
              {maritalStatus
                ? MARITAL_STATUS_LABEL[maritalStatus]
                : "Pilih status..."}
            </span>
            <Icon icon={ChevronDown} size={16} tone="primary" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Kewarganegaraan
          </span>
          <FormInput
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="Indonesia"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Foto KTP (opsional)
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-border flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-left"
          >
            <Icon icon={Paperclip} size={18} tone="muted" />
            <span className="text-muted-foreground line-clamp-1 flex-1 text-sm">
              {ktpPhoto
                ? ktpPhoto.name
                : initial?.ktpPhotoUrl
                  ? "Ganti foto KTP"
                  : "Pilih File"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setKtpPhoto(e.target.files?.[0] ?? null)}
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

      <SingleDatePicker
        open={isDatePickerOpen}
        value={dateOfBirth || "1990-01-01"}
        onClose={() => setDatePickerOpen(false)}
        onApply={(next) => {
          setDateOfBirth(next);
          setDatePickerOpen(false);
        }}
      />

      <OptionDrawer
        open={isGenderPickerOpen}
        title="Pilih Jenis Kelamin"
        options={GENDER_OPTIONS.map((value) => ({
          value,
          label: GENDER_LABEL[value],
        }))}
        selected={gender}
        onClose={() => setGenderPickerOpen(false)}
        onSelect={(value) => {
          setGender(value);
          setGenderPickerOpen(false);
        }}
      />

      <OptionDrawer
        open={isReligionPickerOpen}
        title="Pilih Agama"
        options={RELIGION_OPTIONS.map((value) => ({
          value,
          label: RELIGION_LABEL[value],
        }))}
        selected={religion}
        onClose={() => setReligionPickerOpen(false)}
        onSelect={(value) => {
          setReligion(value);
          setReligionPickerOpen(false);
        }}
      />

      <OptionDrawer
        open={isMaritalPickerOpen}
        title="Pilih Status Pernikahan"
        options={MARITAL_STATUS_OPTIONS.map((value) => ({
          value,
          label: MARITAL_STATUS_LABEL[value],
        }))}
        selected={maritalStatus}
        onClose={() => setMaritalPickerOpen(false)}
        onSelect={(value) => {
          setMaritalStatus(value);
          setMaritalPickerOpen(false);
        }}
      />
    </div>
  );
}
