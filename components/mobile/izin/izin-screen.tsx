"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { FilterTabs } from "@/components/mobile/filter-tabs";
import { StatsRow } from "@/components/mobile/stats-row";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/mobile/date-range-picker";
import { LeaveRequestCard } from "@/components/mobile/izin/leave-request-card";
import { MonthSeparator } from "@/components/mobile/month-separator";
import { ReviewedDivider } from "@/components/mobile/reviewed-divider";
import {
  LeaveTypeDrawer,
  type LeaveRequestType,
} from "@/components/mobile/leave-type-drawer";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { LEAVE_TYPE_LABEL } from "@/lib/leave";
import { formatShortDateWithYear } from "@/lib/date";
import { groupByMonthWithReviewGap } from "@/lib/group-by-month";
import { useLeaveRequestsQuery } from "@/lib/mobile-queries";
import type { Role } from "@/generated/prisma";

type LeaveType = "Sakit" | "Izin" | "Cuti";

const TABS: ("Semua" | LeaveType)[] = ["Semua", "Sakit", "Izin", "Cuti"];

export function IzinScreen({
  role,
  pendingReviewCount = 0,
}: {
  role: Role;
  pendingReviewCount?: number;
}) {
  const router = useRouter();
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
      .toISOString()
      .slice(0, 10);
    return { start, end: today.toISOString().slice(0, 10) };
  });
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [isTypeDrawerOpen, setTypeDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Semua");

  const leave = useLeaveRequestsQuery();

  function handleSelectType(type: LeaveRequestType) {
    setTypeDrawerOpen(false);
    router.push(`/izin/baru?type=${type.toLowerCase()}`);
  }

  const requestsInRange = useMemo(
    () =>
      (leave.data?.items ?? [])
        .filter((request) => {
          if (request.status === "PENDING") return true;
          const startDate = request.startDate.slice(0, 10);
          const endDate = request.endDate.slice(0, 10);
          return startDate <= range.end && endDate >= range.start;
        })
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1)),
    [leave.data, range],
  );

  const visibleRequests =
    activeTab === "Semua"
      ? requestsInRange
      : requestsInRange.filter((r) => LEAVE_TYPE_LABEL[r.type] === activeTab);

  const stats = (["SAKIT", "IZIN", "CUTI"] as const).map((type) => ({
    label: LEAVE_TYPE_LABEL[type],
    value: requestsInRange.filter((r) => r.type === type).length,
  }));

  const monthGroups = useMemo(
    () =>
      groupByMonthWithReviewGap(
        visibleRequests,
        (r) => r.startDate,
        (r) => r.status === "PENDING",
      ),
    [visibleRequests],
  );

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader
        title="Izin"
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
          {leave.isPending ? (
            <div className="flex justify-center py-10">
              <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
            </div>
          ) : visibleRequests.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Tidak ada pengajuan untuk filter ini.
            </p>
          ) : (
            monthGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <MonthSeparator label={group.label} />

                {group.pending.map((request) => (
                  <LeaveRequestCard key={request.id} request={request} />
                ))}

                {group.pending.length > 0 && group.reviewed.length > 0 && (
                  <ReviewedDivider />
                )}

                {group.reviewed.map((request) => (
                  <LeaveRequestCard key={request.id} request={request} />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="border-border bg-background border-t p-4 pb-24">
        <button
          type="button"
          onClick={() => setTypeDrawerOpen(true)}
          className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5 font-medium"
        >
          + Ajukan Pengajuan
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
      />

      <LeaveTypeDrawer
        open={isTypeDrawerOpen}
        onClose={() => setTypeDrawerOpen(false)}
        onSelect={handleSelectType}
      />

      <MobileTabBar role={role} pendingReviewCount={pendingReviewCount} />
    </div>
  );
}
