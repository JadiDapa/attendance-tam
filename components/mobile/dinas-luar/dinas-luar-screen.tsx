"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { MonthSeparator } from "@/components/mobile/month-separator";
import { ReviewedDivider } from "@/components/mobile/reviewed-divider";
import { FieldAssignmentCard } from "@/components/mobile/dinas-luar/field-assignment-card";
import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { groupByMonthWithReviewGap } from "@/lib/group-by-month";
import { useFieldAssignmentsQuery } from "@/lib/mobile-queries";
import type { Role } from "@/generated/prisma";

export function DinasLuarScreen({
  role,
  pendingReviewCount = 0,
}: {
  role: Role;
  pendingReviewCount?: number;
}) {
  const router = useRouter();
  const assignments = useFieldAssignmentsQuery();
  const isSupervisor = role === "SUPERVISOR";

  const items = useMemo(
    () =>
      [...(assignments.data?.items ?? [])].sort((a, b) =>
        a.startDate < b.startDate ? 1 : -1,
      ),
    [assignments.data],
  );

  const monthGroups = useMemo(
    () =>
      groupByMonthWithReviewGap(
        items,
        (a) => a.startDate,
        (a) => a.status === "PENDING",
      ),
    [items],
  );

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader
        title="Dinas Luar"
        showBack
        pendingReviewCount={pendingReviewCount}
      />

      <div className="flex flex-1 flex-col gap-4 px-5 pt-5 pb-5">
        <p className="text-muted-foreground text-sm">
          {isSupervisor
            ? "Penugasan dinas luar yang kamu buat."
            : "Penugasan dinas luar yang menugaskan kamu."}
        </p>

        <div className="flex flex-col gap-3">
          {assignments.isPending ? (
            <div className="flex justify-center py-10">
              <div className="border-muted-foreground/30 border-t-primary size-6 animate-spin rounded-full border-2" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              {isSupervisor
                ? "Belum ada penugasan yang kamu buat."
                : "Belum ada penugasan dinas luar untukmu."}
            </p>
          ) : (
            monthGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-3">
                <MonthSeparator label={group.label} />

                {group.pending.map((assignment) => (
                  <FieldAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                  />
                ))}

                {group.pending.length > 0 && group.reviewed.length > 0 && (
                  <ReviewedDivider />
                )}

                {group.reviewed.map((assignment) => (
                  <FieldAssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {isSupervisor && (
        <div className="border-border bg-background border-t p-4 pb-24">
          <button
            type="button"
            onClick={() => router.push("/dinas-luar/baru")}
            className="bg-primary text-primary-foreground flex w-full items-center justify-center gap-1.5 rounded-xl py-3.5 font-medium"
          >
            <Icon icon={Plus} size={18} tone="inverse" />
            Buat Penugasan
          </button>
        </div>
      )}

      <MobileTabBar role={role} pendingReviewCount={pendingReviewCount} />
    </div>
  );
}
