"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Plus, RefreshCw } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { FilterTabs } from "@/components/mobile/filter-tabs";
import { StatsRow } from "@/components/mobile/stats-row";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/mobile/date-range-picker";
import { MonthSeparator } from "@/components/mobile/month-separator";
import { ReviewedDivider } from "@/components/mobile/reviewed-divider";
import {
  OvertimeRequestCard,
  type OvertimeRequest,
} from "@/components/mobile/lembur/overtime-request-card";
import { OvertimeStartDrawer } from "@/components/mobile/beranda/overtime-start-drawer";
import { OvertimeEndDrawer } from "@/components/mobile/beranda/overtime-end-drawer";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { formatShortDateWithYear, formatTime } from "@/lib/date";
import { groupByMonthWithReviewGap } from "@/lib/group-by-month";
import { useOvertimeHistoryQuery } from "@/lib/mobile-queries";
import { startOvertime, endOvertime } from "@/app/action/overtime.action";
import type { Role } from "@/generated/prisma";
import type { RequestStatus } from "@/components/mobile/beranda/request-card";

const TABS: ("Semua" | RequestStatus)[] = [
  "Semua",
  "Menunggu",
  "Disetujui",
  "Ditolak",
];

const API_STATUS_LABEL: Record<string, RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

function isoTime(iso: string) {
  return formatTime(new Date(iso));
}

function durationLabel(fromIso: string, toIso: string | null) {
  if (!toIso) return "--:--";
  const minutes = Math.round(
    (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000,
  );
  if (minutes < 0) return "--:--";
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

export function LemburScreen({
  role,
  pendingReviewCount = 0,
}: {
  role: Role;
  pendingReviewCount?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
      .toISOString()
      .slice(0, 10);
    return { start, end: today.toISOString().slice(0, 10) };
  });
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isStartDrawerOpen, setStartDrawerOpen] = useState(false);
  const [isEndDrawerOpen, setEndDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Semua");

  const overtime = useOvertimeHistoryQuery();

  const items = useMemo(() => overtime.data?.items ?? [], [overtime.data]);
  const runningOvertime =
    items.find((item) => item.endAt === null && item.status !== "REJECTED") ??
    null;

  function handleStartOvertime(startTime: string, reason: string) {
    startTransition(async () => {
      const result = await startOvertime({ startTime, reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStartDrawerOpen(false);
      toast.success(result.message);
      router.refresh();
      overtime.refetch();
    });
  }

  function handleEndOvertime(endTime?: string) {
    startTransition(async () => {
      const result = await endOvertime({ endTime });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEndDrawerOpen(false);
      toast.success(result.message);
      router.refresh();
      overtime.refetch();
    });
  }

  const requests: OvertimeRequest[] = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        date: item.startAt.slice(0, 10),
        start: isoTime(item.startAt),
        end: item.endAt ? isoTime(item.endAt) : "--:--",
        duration: durationLabel(item.startAt, item.endAt),
        reason: item.reason,
        status: API_STATUS_LABEL[item.status],
      })),
    [items],
  );

  const requestsInRange = requests
    .filter(
      (r) =>
        r.status === "Menunggu" ||
        (r.date >= range.start && r.date <= range.end),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const visibleRequests =
    activeTab === "Semua"
      ? requestsInRange
      : requestsInRange.filter((r) => r.status === activeTab);

  const stats = (["Menunggu", "Disetujui", "Ditolak"] as const).map(
    (status) => ({
      label: status,
      value: requestsInRange.filter((r) => r.status === status).length,
    }),
  );

  const monthGroups = useMemo(
    () =>
      groupByMonthWithReviewGap(
        visibleRequests,
        (r) => r.date,
        (r) => r.status === "Menunggu",
      ),
    [visibleRequests],
  );

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader
        title="Lembur"
        showBack
        pendingReviewCount={pendingReviewCount}
      />

      <div className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-5">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-muted flex flex-1 items-center gap-2 rounded-xl px-4 py-3"
          >
            <Icon icon={Calendar} size={18} tone="muted" />
            <span className="text-foreground text-sm">
              {formatShortDateWithYear(range.start)} -{" "}
              {formatShortDateWithYear(range.end)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="bg-primary text-primary-foreground rounded-xl px-4 text-sm font-medium"
          >
            Filter
          </button>
        </div>

        <FilterTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

        <StatsRow items={stats} />

        <p className="text-muted-foreground text-sm">
          Menampilkan daftar dari {formatShortDateWithYear(range.start)} s/d{" "}
          {formatShortDateWithYear(range.end)}
        </p>

        <div className="flex flex-col gap-3">
          {overtime.isPending ? (
            <div className="flex justify-center py-10">
              <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
            </div>
          ) : overtime.isError ? (
            <button
              type="button"
              onClick={() => overtime.refetch()}
              className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm"
            >
              <Icon icon={RefreshCw} size={16} tone="muted" />
              Gagal memuat data lembur, ketuk untuk coba lagi
            </button>
          ) : visibleRequests.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Tidak ada pengajuan lembur untuk filter ini.
            </p>
          ) : (
            monthGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <MonthSeparator label={group.label} />

                {group.pending.map((request) => (
                  <OvertimeRequestCard key={request.id} request={request} />
                ))}

                {group.pending.length > 0 && group.reviewed.length > 0 && (
                  <ReviewedDivider />
                )}

                {group.reviewed.map((request) => (
                  <OvertimeRequestCard key={request.id} request={request} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-border bg-background border-t p-4 pb-24">
        {runningOvertime ? (
          <button
            type="button"
            onClick={() => setEndDrawerOpen(true)}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3.5"
          >
            <span className="size-2 rounded-full bg-white" />
            <span className="line-clamp-1 font-medium text-white">
              Lembur Berjalan • Mulai {isoTime(runningOvertime.startAt)} —
              Checkout
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setStartDrawerOpen(true)}
            disabled={isPending}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5"
          >
            <Icon icon={Plus} size={18} tone="inverse" />
            <span className="font-medium">Ajukan Lembur</span>
          </button>
        )}
      </div>

      <DateRangePicker
        open={isPickerOpen}
        value={range}
        onClose={() => setPickerOpen(false)}
        onApply={(next) => {
          setRange(next);
          setPickerOpen(false);
        }}
      />

      <OvertimeStartDrawer
        open={isStartDrawerOpen}
        onClose={() => setStartDrawerOpen(false)}
        onStart={handleStartOvertime}
        submitting={isPending}
      />

      {runningOvertime && (
        <OvertimeEndDrawer
          open={isEndDrawerOpen}
          startedAtLabel={isoTime(runningOvertime.startAt)}
          submitting={isPending}
          onClose={() => setEndDrawerOpen(false)}
          onEnd={handleEndOvertime}
        />
      )}

      <MobileTabBar role={role} pendingReviewCount={pendingReviewCount} />
    </div>
  );
}
