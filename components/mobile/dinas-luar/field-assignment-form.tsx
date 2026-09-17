"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, ChevronDown, Paperclip } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/mobile/date-range-picker";
import { OptionDrawer } from "@/components/mobile/option-drawer";
import { EmployeeMultiSelect } from "@/components/mobile/dinas-luar/employee-multi-select";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { createFieldAssignment } from "@/app/action/field-assignment.action";
import { TRANSPORTATION_LABEL } from "@/lib/field-assignment";
import { useEmployeesQuery } from "@/lib/mobile-queries";
import type { TransportationType } from "@/generated/prisma";

const TRANSPORTATION_OPTIONS = Object.keys(
  TRANSPORTATION_LABEL,
) as TransportationType[];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Mirrors mobile's `FieldAssignmentForm` — supervisor-only "Buat Penugasan" create form. */
export function FieldAssignmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const employeesQuery = useEmployeesQuery();
  const employees = employeesQuery.data?.items ?? [];

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(() => ({
    start: todayIso(),
    end: todayIso(),
  }));
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [activityDetail, setActivityDetail] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [destinationCity, setDestinationCity] = useState("");
  const [destinationCityError, setDestinationCityError] = useState<
    string | null
  >(null);
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationAddressError, setDestinationAddressError] = useState<
    string | null
  >(null);
  const [purpose, setPurpose] = useState("");
  const [purposeError, setPurposeError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [transportation, setTransportation] =
    useState<TransportationType | null>(null);
  const [transportationError, setTransportationError] = useState<string | null>(
    null,
  );
  const [isTransportationPickerOpen, setTransportationPickerOpen] =
    useState(false);
  const [transportationOther, setTransportationOther] = useState("");
  const [transportationOtherError, setTransportationOtherError] = useState<
    string | null
  >(null);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [estimatedCostError, setEstimatedCostError] = useState<string | null>(
    null,
  );

  const selectedEmployees = employees.filter((e) => selectedIds.includes(e.id));

  function handleSubmit() {
    let hasError = false;

    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu karyawan untuk ditugaskan.");
      hasError = true;
    }

    if (activityDetail.trim().length < 5) {
      setReasonError("Kegiatan/Tujuan minimal 5 karakter");
      hasError = true;
    } else {
      setReasonError(null);
    }

    if (destinationCity.trim().length === 0) {
      setDestinationCityError("Tujuan kota wajib diisi");
      hasError = true;
    } else {
      setDestinationCityError(null);
    }

    if (destinationAddress.trim().length === 0) {
      setDestinationAddressError("Lokasi/alamat tujuan wajib diisi");
      hasError = true;
    } else {
      setDestinationAddressError(null);
    }

    if (purpose.trim().length === 0) {
      setPurposeError("Keperluan dinas wajib diisi");
      hasError = true;
    } else {
      setPurposeError(null);
    }

    if (!transportation) {
      setTransportationError("Transportasi wajib dipilih");
      hasError = true;
    } else {
      setTransportationError(null);
    }

    if (
      transportation === "LAINNYA" &&
      transportationOther.trim().length === 0
    ) {
      setTransportationOtherError("Sebutkan transportasi yang digunakan");
      hasError = true;
    } else {
      setTransportationOtherError(null);
    }

    const parsedCost = Number.parseInt(estimatedCost, 10);
    if (!estimatedCost.trim() || Number.isNaN(parsedCost) || parsedCost <= 0) {
      setEstimatedCostError("Estimasi biaya wajib diisi dan lebih dari 0");
      hasError = true;
    } else {
      setEstimatedCostError(null);
    }

    if (!attachment) {
      setAttachmentError("Lampiran rincian biaya wajib diunggah");
      hasError = true;
    } else {
      setAttachmentError(null);
    }

    if (hasError) return;

    const formData = new FormData();
    for (const id of selectedIds) formData.append("employeeIds", id);
    formData.append("startDate", range.start);
    formData.append("endDate", range.end);
    formData.append("activityDetail", activityDetail.trim());
    formData.append("destinationCity", destinationCity.trim());
    formData.append("destinationAddress", destinationAddress.trim());
    formData.append("purpose", purpose.trim());
    if (companyName.trim().length > 0)
      formData.append("companyName", companyName.trim());
    formData.append("transportation", transportation!);
    if (transportation === "LAINNYA")
      formData.append("transportationOther", transportationOther.trim());
    formData.append("estimatedCost", String(parsedCost));
    formData.append("attachment", attachment!);

    startTransition(async () => {
      const result = await createFieldAssignment(formData);
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
      <MobilePageHeader title="Buat Penugasan" showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">Karyawan</span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-muted flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-left"
          >
            {selectedEmployees.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                Pilih karyawan...
              </span>
            ) : (
              <span className="text-foreground flex-1 text-sm">
                {selectedEmployees.map((e) => e.name).join(", ")}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Tanggal Berangkat - Estimasi Tanggal Pulang
          </span>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="bg-muted flex items-center gap-2 rounded-xl px-4 py-3 text-left"
          >
            <Icon icon={Calendar} size={18} tone="muted" />
            <span className="text-foreground text-sm">
              {formatShortDate(range.start)} - {formatShortDate(range.end)}
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Tujuan Kota
          </span>
          <input
            value={destinationCity}
            onChange={(e) => {
              setDestinationCity(e.target.value);
              if (destinationCityError) setDestinationCityError(null);
            }}
            placeholder="Contoh: Surabaya"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
          {destinationCityError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {destinationCityError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Lokasi/Alamat Tujuan
          </span>
          <textarea
            value={destinationAddress}
            onChange={(e) => {
              setDestinationAddress(e.target.value);
              if (destinationAddressError) setDestinationAddressError(null);
            }}
            placeholder="Contoh: Jl. Raya Darmo No. 1, Surabaya"
            rows={2}
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
          {destinationAddressError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {destinationAddressError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Nama Perusahaan/Instansi yang Dikunjungi (opsional)
          </span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Contoh: PT Maju Bersama"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Keperluan Dinas
          </span>
          <input
            value={purpose}
            onChange={(e) => {
              setPurpose(e.target.value);
              if (purposeError) setPurposeError(null);
            }}
            placeholder="Contoh: presentasi proposal kerja sama"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
          {purposeError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {purposeError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Transportasi
          </span>
          <button
            type="button"
            onClick={() => setTransportationPickerOpen(true)}
            className="bg-muted flex items-center justify-between rounded-xl px-4 py-3 text-left"
          >
            <span className="text-foreground text-sm">
              {transportation
                ? TRANSPORTATION_LABEL[transportation]
                : "Pilih transportasi..."}
            </span>
            <Icon icon={ChevronDown} size={16} tone="primary" />
          </button>
          {transportationError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {transportationError}
            </span>
          )}
        </div>

        {transportation === "LAINNYA" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">
              Sebutkan Transportasi
            </span>
            <input
              value={transportationOther}
              onChange={(e) => {
                setTransportationOther(e.target.value);
                if (transportationOtherError) setTransportationOtherError(null);
              }}
              placeholder="Contoh: sewa mobil"
              className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
            />
            {transportationOtherError && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {transportationOtherError}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Estimasi Biaya
          </span>
          <input
            value={estimatedCost}
            onChange={(e) => {
              setEstimatedCost(e.target.value.replace(/[^0-9]/g, ""));
              if (estimatedCostError) setEstimatedCostError(null);
            }}
            placeholder="Contoh: 1500000"
            inputMode="numeric"
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
          {estimatedCostError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {estimatedCostError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Kegiatan/Tujuan
          </span>
          <textarea
            value={activityDetail}
            onChange={(e) => {
              setActivityDetail(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            placeholder="Contoh: kunjungan klien di Surabaya"
            rows={4}
            className="border-border bg-input rounded-xl border px-4 py-3 text-sm"
          />
          {reasonError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {reasonError}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">
            Upload Rincian Biaya (wajib)
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-border flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-left"
          >
            <Icon icon={Paperclip} size={18} tone="muted" />
            <span className="text-muted-foreground line-clamp-1 flex-1 text-sm">
              {attachment ? attachment.name : "Pilih File"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setAttachment(file);
              if (file) setAttachmentError(null);
            }}
          />
          <span className="text-muted-foreground text-xs">
            JPG, PNG, WEBP, atau PDF, maks 5MB.
          </span>
          {attachmentError && (
            <span className="text-xs text-red-600 dark:text-red-400">
              {attachmentError}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending}
          className="bg-primary text-primary-foreground mt-2 flex items-center justify-center gap-2 rounded-xl py-3.5 font-medium disabled:opacity-60"
        >
          Kirim Penugasan
        </button>
      </div>

      <EmployeeMultiSelect
        open={isPickerOpen}
        employees={employees}
        selectedIds={selectedIds}
        onClose={() => setPickerOpen(false)}
        onApply={setSelectedIds}
      />

      <DateRangePicker
        open={isDatePickerOpen}
        value={range}
        onClose={() => setDatePickerOpen(false)}
        onApply={(next) => {
          setRange(next);
          setDatePickerOpen(false);
        }}
      />

      <OptionDrawer
        open={isTransportationPickerOpen}
        title="Pilih Transportasi"
        options={TRANSPORTATION_OPTIONS.map((value) => ({
          value,
          label: TRANSPORTATION_LABEL[value],
        }))}
        selected={transportation}
        onClose={() => setTransportationPickerOpen(false)}
        onSelect={(value) => {
          setTransportation(value);
          setTransportationError(null);
          setTransportationPickerOpen(false);
        }}
      />
    </div>
  );
}
