"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, ChevronDown } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { FormInput } from "@/components/mobile/form-input";
import { OptionDrawer } from "@/components/mobile/option-drawer";
import { SingleDatePicker } from "@/components/mobile/single-date-picker";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { upsertEmploymentData } from "@/app/action/employee-profile.action";
import { EMPLOYMENT_STATUS_LABEL } from "@/lib/employee-profile";
import type { ApiEmploymentData } from "@/lib/mobile-queries";
import type { EmploymentStatus } from "@/generated/prisma";

const EMPLOYMENT_STATUS_OPTIONS = Object.keys(
  EMPLOYMENT_STATUS_LABEL,
) as EmploymentStatus[];

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Mirrors mobile's `employee-data-employment.tsx`. */
export function EmploymentForm({
  initial,
}: {
  initial: ApiEmploymentData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [employeeNumber, setEmployeeNumber] = useState(
    initial?.employeeNumber ?? "",
  );
  const [workLocation, setWorkLocation] = useState(initial?.workLocation ?? "");
  const [employmentStatus, setEmploymentStatus] =
    useState<EmploymentStatus | null>(initial?.employmentStatus ?? null);
  const [isStatusPickerOpen, setStatusPickerOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    initial?.startDate?.slice(0, 10) ?? "",
  );
  const [isStartDatePickerOpen, setStartDatePickerOpen] = useState(false);
  const [contractEndDate, setContractEndDate] = useState(
    initial?.contractEndDate?.slice(0, 10) ?? "",
  );
  const [isEndDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPkwt = employmentStatus === "PKWT";

  function handleSubmit() {
    setError(null);

    if (
      !employeeNumber.trim() ||
      !workLocation.trim() ||
      !employmentStatus ||
      !startDate
    ) {
      setError("Semua field wajib diisi");
      return;
    }

    if (isPkwt && !contractEndDate) {
      setError("Tanggal berakhir kontrak wajib diisi untuk status PKWT");
      return;
    }

    startTransition(async () => {
      const result = await upsertEmploymentData({
        employeeNumber,
        workLocation,
        employmentStatus,
        startDate,
        contractEndDate: isPkwt ? contractEndDate : undefined,
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
      <MobilePageHeader title="Data Kepegawaian" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Nomor Induk Pegawai
          </span>
          <FormInput
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            placeholder="Contoh: EMP-0001"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Lokasi Kerja
          </span>
          <FormInput
            value={workLocation}
            onChange={(e) => setWorkLocation(e.target.value)}
            placeholder="Contoh: Kantor Pusat"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Status Kepegawaian
          </span>
          <button
            type="button"
            onClick={() => setStatusPickerOpen(true)}
            className="bg-muted flex items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <span className="text-foreground text-sm">
              {employmentStatus
                ? EMPLOYMENT_STATUS_LABEL[employmentStatus]
                : "Pilih status..."}
            </span>
            <Icon icon={ChevronDown} size={16} tone="primary" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Tanggal Masuk
          </span>
          <button
            type="button"
            onClick={() => setStartDatePickerOpen(true)}
            className="bg-muted flex items-center gap-2 rounded-xl px-4 py-3 text-left"
          >
            <Icon icon={Calendar} size={18} tone="muted" />
            <span className="text-foreground text-sm">
              {startDate ? formatShortDate(startDate) : "Pilih tanggal..."}
            </span>
          </button>
        </div>

        {isPkwt && (
          <div className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">
              Tanggal Berakhir Kontrak
            </span>
            <button
              type="button"
              onClick={() => setEndDatePickerOpen(true)}
              className="bg-muted flex items-center gap-2 rounded-xl px-4 py-3 text-left"
            >
              <Icon icon={Calendar} size={18} tone="muted" />
              <span className="text-foreground text-sm">
                {contractEndDate
                  ? formatShortDate(contractEndDate)
                  : "Pilih tanggal..."}
              </span>
            </button>
          </div>
        )}

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

      <OptionDrawer
        open={isStatusPickerOpen}
        title="Pilih Status Kepegawaian"
        options={EMPLOYMENT_STATUS_OPTIONS.map((value) => ({
          value,
          label: EMPLOYMENT_STATUS_LABEL[value],
        }))}
        selected={employmentStatus}
        onClose={() => setStatusPickerOpen(false)}
        onSelect={(value) => {
          setEmploymentStatus(value);
          setStatusPickerOpen(false);
        }}
      />

      <SingleDatePicker
        open={isStartDatePickerOpen}
        value={startDate || new Date().toISOString().slice(0, 10)}
        onClose={() => setStartDatePickerOpen(false)}
        onApply={(next) => {
          setStartDate(next);
          setStartDatePickerOpen(false);
        }}
      />

      <SingleDatePicker
        open={isEndDatePickerOpen}
        value={
          contractEndDate || startDate || new Date().toISOString().slice(0, 10)
        }
        onClose={() => setEndDatePickerOpen(false)}
        onApply={(next) => {
          setContractEndDate(next);
          setEndDatePickerOpen(false);
        }}
      />
    </div>
  );
}
