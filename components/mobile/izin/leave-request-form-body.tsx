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
import { MobilePageHeader } from "@/components/mobile/page-header";
import { createLeaveRequest } from "@/app/action/leave.action";
import {
  CUTI_REASON_CATEGORIES,
  IZIN_REASON_CATEGORIES,
  LEAVE_REASON_CATEGORY_LABEL,
  defaultCutiStartDate,
  minCutiStartDateInputValue,
  minIzinStartDateInputValue,
} from "@/lib/leave";
import { toDateInputValue } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { LeaveReasonCategory } from "@/generated/prisma";

const ATTACHMENT_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

export type LeaveFormType = "Sakit" | "Izin" | "Cuti";

const TYPE_TO_ENUM: Record<LeaveFormType, "SAKIT" | "IZIN" | "CUTI"> = {
  Sakit: "SAKIT",
  Izin: "IZIN",
  Cuti: "CUTI",
};

const TYPE_BADGE_CLASSES: Record<LeaveFormType, string> = {
  Sakit: "bg-orange-100 dark:bg-orange-950",
  Izin: "bg-amber-100 dark:bg-amber-950",
  Cuti: "bg-blue-100 dark:bg-blue-950",
};

const TYPE_TEXT_CLASSES: Record<LeaveFormType, string> = {
  Sakit: "text-orange-600 dark:text-orange-400",
  Izin: "text-amber-600 dark:text-amber-400",
  Cuti: "text-blue-600 dark:text-blue-400",
};

const REASON_CATEGORY_OPTIONS: Record<"Cuti" | "Izin", LeaveReasonCategory[]> =
  {
    Cuti: CUTI_REASON_CATEGORIES,
    Izin: IZIN_REASON_CATEGORIES,
  };

function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function LeaveRequestFormBody({
  type,
  reasonPlaceholder,
}: {
  type: LeaveFormType;
  reasonPlaceholder: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCuti = type === "Cuti";
  const isIzin = type === "Izin";
  const isSakit = type === "Sakit";
  const cutiMinDate = isCuti ? minCutiStartDateInputValue() : undefined;
  const izinMinDate = isIzin ? minIzinStartDateInputValue() : undefined;

  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (isCuti) {
      const start = toDateInputValue(defaultCutiStartDate());
      return { start, end: start };
    }
    if (isIzin && izinMinDate) return { start: izinMinDate, end: izinMinDate };
    return { start: today, end: today };
  });
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reasonCategory, setReasonCategory] =
    useState<LeaveReasonCategory | null>(null);
  const [isCategoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    let hasError = false;

    if (detail.trim().length < 5) {
      setReasonError("Detail minimal 5 karakter");
      hasError = true;
    } else {
      setReasonError(null);
    }

    if (!isSakit && !reasonCategory) {
      setCategoryError("Alasan wajib dipilih");
      hasError = true;
    } else {
      setCategoryError(null);
    }

    if (isSakit && !attachment) {
      setAttachmentError("Lampiran wajib diunggah untuk pengajuan Sakit");
      hasError = true;
    } else {
      setAttachmentError(null);
    }

    if (hasError) return;

    const formData = new FormData();
    formData.append("type", TYPE_TO_ENUM[type]);
    formData.append("startDate", range.start);
    formData.append("endDate", range.end);
    formData.append("detail", detail.trim());
    if (!isSakit && reasonCategory)
      formData.append("reasonCategory", reasonCategory);
    if (attachment) formData.append("attachment", attachment);

    startTransition(async () => {
      const result = await createLeaveRequest(formData);
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
      <MobilePageHeader title={`Ajukan ${type}`} showBack />

      <div className="flex flex-col gap-4 p-5 pb-24">
        <span
          className={cn(
            "self-start rounded-full px-3 py-1 text-sm font-medium",
            TYPE_BADGE_CLASSES[type],
            TYPE_TEXT_CLASSES[type],
          )}
        >
          {type}
        </span>

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">Tanggal</span>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-muted flex items-center gap-2 rounded-xl px-4 py-3 text-left"
          >
            <Icon icon={Calendar} size={18} tone="muted" />
            <span className="text-foreground text-sm">
              {formatShortDate(range.start)} - {formatShortDate(range.end)}
            </span>
          </button>
          {isCuti && (
            <span className="text-muted-foreground text-xs">
              Cuti wajib diajukan minimal 30 hari sebelum tanggal mulai.
            </span>
          )}
          {isIzin && (
            <span className="text-muted-foreground text-xs">
              Izin wajib diajukan minimal 2 hari sebelum tanggal mulai.
            </span>
          )}
        </div>

        {!isSakit && (
          <div className="flex flex-col gap-1.5">
            <span className="text-foreground text-sm font-medium">Alasan</span>
            <button
              type="button"
              onClick={() => setCategoryPickerOpen(true)}
              className="bg-muted flex items-center justify-between rounded-xl px-4 py-3 text-left"
            >
              <span className="text-foreground text-sm">
                {reasonCategory
                  ? LEAVE_REASON_CATEGORY_LABEL[reasonCategory]
                  : "Pilih alasan..."}
              </span>
              <Icon icon={ChevronDown} size={16} tone="primary" />
            </button>
            {categoryError && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {categoryError}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-foreground text-sm font-medium">Detail</span>
          <textarea
            value={detail}
            onChange={(e) => {
              setDetail(e.target.value);
              if (reasonError) setReasonError(null);
            }}
            placeholder={reasonPlaceholder}
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
            {isSakit ? "Lampiran (wajib)" : "Lampiran (opsional)"}
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
            accept={ATTACHMENT_TYPES}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setAttachment(file);
              if (file) setAttachmentError(null);
            }}
          />
          <span className="text-muted-foreground text-xs">
            Surat dokter atau bukti pendukung — JPG, PNG, WEBP, atau PDF, maks
            5MB.
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
          Kirim Pengajuan
        </button>
      </div>

      <DateRangePicker
        open={isPickerOpen}
        value={range}
        onClose={() => setPickerOpen(false)}
        onApply={(next) => {
          setRange(next);
          setPickerOpen(false);
        }}
        minDate={cutiMinDate ?? izinMinDate}
      />

      {!isSakit && (
        <OptionDrawer
          open={isCategoryPickerOpen}
          title="Pilih Alasan"
          options={REASON_CATEGORY_OPTIONS[type as "Cuti" | "Izin"].map(
            (category) => ({
              value: category,
              label: LEAVE_REASON_CATEGORY_LABEL[category],
            }),
          )}
          selected={reasonCategory}
          onClose={() => setCategoryPickerOpen(false)}
          onSelect={(value) => {
            setReasonCategory(value);
            setCategoryError(null);
            setCategoryPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
