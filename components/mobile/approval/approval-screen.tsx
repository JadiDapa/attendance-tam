"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ShieldCheck, ChevronRight, RefreshCw } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { FilterTabs } from "@/components/mobile/filter-tabs";
import { StatsRow } from "@/components/mobile/stats-row";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/mobile/date-range-picker";
import { LeaveApprovalCard } from "@/components/mobile/approval/leave-approval-card";
import { OvertimeApprovalCard } from "@/components/mobile/approval/overtime-approval-card";
import { FieldAssignmentApprovalCard } from "@/components/mobile/approval/field-assignment-approval-card";
import { HistoryCard } from "@/components/mobile/approval/history-card";
import { MonthSeparator } from "@/components/mobile/month-separator";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { formatShortDateWithYear } from "@/lib/date";
import {
  usePendingLeaveApprovalsQuery,
  usePendingOvertimeApprovalsQuery,
  usePendingFieldAssignmentApprovalsQuery,
  useReviewHistoryQuery,
  type ApprovalLogEntry,
} from "@/lib/mobile-queries";
import type { Role } from "@/generated/prisma";

const TYPE_TABS = ["Semua", "Izin", "Lembur", "Dinas Luar"] as const;
type TypeTab = (typeof TYPE_TABS)[number];

const TYPE_TO_LOG_TYPE: Record<
  Exclude<TypeTab, "Semua">,
  ApprovalLogEntry["type"]
> = {
  Izin: "LEAVE",
  Lembur: "OVERTIME",
  "Dinas Luar": "FIELD_ASSIGNMENT",
};

function monthKey(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Mirrors mobile's `ReviewScreen` — merges pending leave/overtime/field-assignment + review history into one feed. */
export function ApprovalScreen({
  role,
  pendingReviewCount = 0,
}: {
  role: Role;
  pendingReviewCount?: number;
}) {
  const router = useRouter();

  const canSeeLeave = role === "SUPERVISOR" || role === "MANAGER";
  const canSeeOvertime = role === "SUPERVISOR" || role === "MANAGER";
  const canSeeFieldAssignment = role === "MANAGER";
  const canSeeAttendance = role === "SUPERVISOR" || role === "MANAGER";

  const visibleTypeTabs = TYPE_TABS.filter((tab) => {
    if (tab === "Semua") return true;
    if (tab === "Izin") return canSeeLeave;
    if (tab === "Lembur") return canSeeOvertime;
    return canSeeFieldAssignment;
  });

  const [typeTab, setTypeTab] = useState<TypeTab>("Semua");
  const [range, setRange] = useState<DateRange>(() => {
    const today = new Date();
    const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
      .toISOString()
      .slice(0, 10);
    return { start, end: today.toISOString().slice(0, 10) };
  });
  const [isPickerOpen, setPickerOpen] = useState(false);

  const showLeave = canSeeLeave && (typeTab === "Semua" || typeTab === "Izin");
  const showOvertime =
    canSeeOvertime && (typeTab === "Semua" || typeTab === "Lembur");
  const showFieldAssignment =
    canSeeFieldAssignment && (typeTab === "Semua" || typeTab === "Dinas Luar");

  const leave = usePendingLeaveApprovalsQuery(showLeave);
  const overtime = usePendingOvertimeApprovalsQuery(showOvertime);
  const fieldAssignment =
    usePendingFieldAssignmentApprovalsQuery(showFieldAssignment);
  const history = useReviewHistoryQuery(
    typeTab === "Semua" ? undefined : TYPE_TO_LOG_TYPE[typeTab],
  );

  const items = useMemo(() => {
    type Item = {
      date: string;
      status: "Menunggu" | "Disetujui" | "Ditolak";
      key: string;
      node: ReactNode;
    };
    const result: Item[] = [];

    if (showLeave) {
      for (const request of leave.data?.items ?? []) {
        result.push({
          date: request.startDate,
          status: "Menunggu",
          key: `leave-${request.id}`,
          node: <LeaveApprovalCard request={request} />,
        });
      }
    }

    if (showOvertime) {
      for (const request of overtime.data?.items ?? []) {
        result.push({
          date: request.startAt.slice(0, 10),
          status: "Menunggu",
          key: `overtime-${request.id}`,
          node: <OvertimeApprovalCard request={request} />,
        });
      }
    }

    if (showFieldAssignment) {
      for (const assignment of fieldAssignment.data?.items ?? []) {
        result.push({
          date: assignment.startDate,
          status: "Menunggu",
          key: `field-assignment-${assignment.id}`,
          node: <FieldAssignmentApprovalCard assignment={assignment} />,
        });
      }
    }

    const statusLabel = {
      PENDING: "Menunggu",
      APPROVED: "Disetujui",
      REJECTED: "Ditolak",
    } as const;
    for (const entry of history.data?.items ?? []) {
      result.push({
        date: entry.reviewedAt.slice(0, 10),
        status: statusLabel[entry.status],
        key: `history-${entry.id}`,
        node: <HistoryCard entry={entry} />,
      });
    }

    return result;
  }, [
    showLeave,
    showOvertime,
    showFieldAssignment,
    leave.data,
    overtime.data,
    fieldAssignment.data,
    history.data,
  ]);

  const itemsInRange = items
    .filter(
      (item) =>
        item.status === "Menunggu" ||
        (item.date >= range.start && item.date <= range.end),
    )
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const stats = (["Menunggu", "Disetujui", "Ditolak"] as const).map(
    (status) => ({
      label: status,
      value: itemsInRange.filter((item) => item.status === status).length,
    }),
  );

  const isLoading =
    (showLeave && leave.isPending) ||
    (showOvertime && overtime.isPending) ||
    (showFieldAssignment && fieldAssignment.isPending) ||
    history.isPending;

  let lastMonthKey: string | null = null;

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader
        title="Review"
        showBack
        pendingReviewCount={pendingReviewCount}
      />

      <div className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-5">
        <p className="text-muted-foreground text-sm">
          Pengajuan izin, lembur, dan dinas luar yang jadi giliranmu.
        </p>

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

        <FilterTabs
          tabs={visibleTypeTabs}
          active={typeTab}
          onChange={setTypeTab}
        />

        <StatsRow items={stats} />

        {canSeeAttendance && (
          <button
            type="button"
            onClick={() => router.push("/verifikasi-absensi")}
            className="bg-card flex items-center gap-3 rounded-2xl p-4 text-left"
          >
            <span className="bg-muted flex h-11 w-11 items-center justify-center rounded-full">
              <Icon icon={ShieldCheck} size={20} tone="primary" />
            </span>
            <span className="flex-1">
              <span className="text-foreground block text-sm font-medium">
                Verifikasi Absensi
              </span>
              <span className="text-muted-foreground block text-xs">
                Absensi di luar radius kantor
              </span>
            </span>
            <Icon icon={ChevronRight} size={16} tone="primary" />
          </button>
        )}

        <div className="flex flex-col gap-3">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
            </div>
          ) : history.isError ? (
            <button
              type="button"
              onClick={() => history.refetch()}
              className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm"
            >
              <Icon icon={RefreshCw} size={16} tone="muted" />
              Gagal memuat data, ketuk untuk coba lagi
            </button>
          ) : itemsInRange.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              Tidak ada pengajuan untuk filter ini.
            </p>
          ) : (
            itemsInRange.map((item) => {
              const currentMonthKey = monthKey(item.date);
              const showSeparator = currentMonthKey !== lastMonthKey;
              lastMonthKey = currentMonthKey;

              return (
                <div key={item.key} className="flex flex-col gap-3">
                  {showSeparator && (
                    <MonthSeparator label={monthLabel(item.date)} />
                  )}
                  {item.node}
                </div>
              );
            })
          )}
        </div>
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

      <MobileTabBar role={role} pendingReviewCount={pendingReviewCount} />
    </div>
  );
}
