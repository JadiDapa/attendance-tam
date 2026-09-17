"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  MapPin,
  Plus,
  AlertCircle,
  FileText,
  Timer,
  Briefcase,
} from "lucide-react";
import { Avatar } from "@/components/mobile/avatar";
import { Icon } from "@/components/mobile/icon";
import { NotificationBadge } from "@/components/mobile/notification-badge";
import { Card } from "@/components/mobile/card";
import { AttendanceTimeItem } from "@/components/mobile/attendance-time-item";
import { MenuGrid } from "@/components/mobile/beranda/menu-grid";
import { SectionHeader } from "@/components/mobile/beranda/section-header";
import {
  RequestListGroup,
  type SummaryRequest,
} from "@/components/mobile/beranda/request-card";
import {
  AttendanceCard,
  type DayRecord,
} from "@/components/mobile/histori/attendance-card";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import { OvertimeStartDrawer } from "@/components/mobile/beranda/overtime-start-drawer";
import { OvertimeEndDrawer } from "@/components/mobile/beranda/overtime-end-drawer";
import { startOvertime, endOvertime } from "@/app/action/overtime.action";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function formatLongIndonesianDateClient(date: Date) {
  return date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type CheckEntry = { time: string; isLate: boolean; lateMinutes: number };
type CheckOutEntry = { time: string };

export function HomeScreen({
  user,
  pendingReviewCount,
  officeLocationName,
  checkIn,
  checkOut,
  checkInClosed,
  faceEnrolled,
  runningOvertime,
  completedOvertimeToday,
  recentAttendance,
  leaveRequestCards,
  overtimeCards,
  fieldAssignmentCards,
}: {
  user: { name: string; role: Role; profileImageUrl: string | null };
  pendingReviewCount: number;
  officeLocationName: string | null;
  checkIn: CheckEntry | null;
  checkOut: CheckOutEntry | null;
  checkInClosed: boolean;
  faceEnrolled: boolean;
  runningOvertime: { id: string; startAtIso: string } | null;
  completedOvertimeToday: {
    startAtIso: string;
    endAtIso: string | null;
    statusLabel: string;
  } | null;
  recentAttendance: DayRecord[];
  leaveRequestCards: SummaryRequest[];
  overtimeCards: SummaryRequest[];
  fieldAssignmentCards: SummaryRequest[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startDrawerOpen, setStartDrawerOpen] = useState(false);
  const [endDrawerOpen, setEndDrawerOpen] = useState(false);

  const hasCheckedIn = checkIn !== null;
  const hasCheckedOut = checkOut !== null;

  const actionButton = !faceEnrolled
    ? {
        label: "Daftarkan Wajah Dulu",
        disabled: false,
        href: "/verifikasi-wajah",
      }
    : !hasCheckedIn
      ? checkInClosed
        ? {
            label: "Absen Masuk Sudah Ditutup",
            disabled: true,
            href: "/absen?type=CHECK_IN",
          }
        : {
            label: "Absen Masuk",
            disabled: false,
            href: "/absen?type=CHECK_IN",
          }
      : !hasCheckedOut
        ? {
            label: "Absen Pulang",
            disabled: false,
            href: "/absen?type=CHECK_OUT",
          }
        : { label: "Absensi Hari Ini Selesai", disabled: true, href: "/absen" };

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
    });
  }

  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex flex-col md:hidden">
      <div className="pb-24">
        <div className="bg-primary px-5 pt-[calc(env(safe-area-inset-top)+1.75rem)] pb-24">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-3">
              <Avatar name={user.name} imageUrl={user.profileImageUrl} />

              <div className="min-w-0 flex-1">
                <p className="text-primary-foreground/70 line-clamp-1 text-xs">
                  {greeting()},
                </p>
                <p className="text-primary-foreground line-clamp-1 text-base font-bold">
                  {user.name}
                </p>
              </div>
            </div>

            <Link
              href="/notifikasi"
              className="bg-primary-foreground/15 relative flex h-11 w-11 items-center justify-center rounded-full"
            >
              <Bell size={20} color="#ffffff" />
              <NotificationBadge count={pendingReviewCount} />
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-8 px-5 pb-8">
          <div className="-mt-20 flex flex-col gap-5">
            <Card className="gap-5 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-sm font-medium">
                  {formatLongIndonesianDateClient(new Date())}
                </span>

                {officeLocationName && (
                  <div className="flex items-center gap-1">
                    <Icon icon={MapPin} size={14} tone="muted" />
                    <span className="text-muted-foreground line-clamp-1 max-w-35 text-xs">
                      {officeLocationName}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-stretch">
                  <AttendanceTimeItem
                    label="Check In"
                    value={checkIn ? checkIn.time : "--:--"}
                    tone={
                      checkIn?.isLate ? "danger" : checkIn ? "primary" : "muted"
                    }
                  />
                  <div className="border-border w-px border-l border-dashed" />
                  <AttendanceTimeItem
                    label="Check Out"
                    value={checkOut ? checkOut.time : "--:--"}
                    tone={checkOut ? "primary" : "muted"}
                  />
                  <div className="border-border w-px border-l border-dashed" />
                  <AttendanceTimeItem
                    label="Total Jam"
                    value={
                      checkIn && checkOut
                        ? totalHoursLabel(checkIn.time, checkOut.time)
                        : "--:--"
                    }
                  />
                </div>

                {checkIn?.isLate && (
                  <div className="mx-auto flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 dark:bg-red-500/15">
                    <Icon icon={AlertCircle} size={14} tone="destructive" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                      Terlambat
                      {checkIn.lateMinutes > 0
                        ? ` ${lateLabel(checkIn.lateMinutes)}`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              <Link
                href={actionButton.href}
                aria-disabled={actionButton.disabled}
                className={cn(
                  "rounded-full py-4 text-center",
                  actionButton.disabled
                    ? "bg-muted text-muted-foreground pointer-events-none font-medium"
                    : "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {actionButton.label}
              </Link>
            </Card>

            {hasCheckedOut && (
              <Card className="dark:bg-primary/70 bg-accent gap-5 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-sm font-medium">
                    Lembur
                  </span>

                  {runningOvertime && (
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-xs font-medium text-amber-600">
                        Berjalan
                      </span>
                    </div>
                  )}

                  {completedOvertimeToday && (
                    <span className="text-muted-foreground text-xs font-medium">
                      {completedOvertimeToday.statusLabel}
                    </span>
                  )}
                </div>

                {(runningOvertime || completedOvertimeToday) && (
                  <div className="flex items-stretch">
                    <AttendanceTimeItem
                      label="Check In"
                      value={isoTime(
                        (runningOvertime ?? completedOvertimeToday)!.startAtIso,
                      )}
                    />
                    <div className="border-border w-px border-l border-dashed" />
                    <AttendanceTimeItem
                      label="Check Out"
                      value={
                        completedOvertimeToday?.endAtIso
                          ? isoTime(completedOvertimeToday.endAtIso)
                          : "--:--"
                      }
                      tone={
                        completedOvertimeToday?.endAtIso ? "default" : "muted"
                      }
                    />
                    <div className="border-border w-px border-l border-dashed" />
                    <AttendanceTimeItem
                      label="Total Jam"
                      value={totalHoursLabel(
                        isoTime(
                          (runningOvertime ?? completedOvertimeToday)!
                            .startAtIso,
                        ),
                        completedOvertimeToday?.endAtIso
                          ? isoTime(completedOvertimeToday.endAtIso)
                          : isoTime(new Date().toISOString()),
                      )}
                    />
                  </div>
                )}

                {runningOvertime ? (
                  <button
                    type="button"
                    onClick={() => setEndDrawerOpen(true)}
                    disabled={isPending}
                    className="flex items-center justify-center gap-2 rounded-full bg-amber-600 py-4 font-semibold text-white"
                  >
                    Checkout Lembur
                  </button>
                ) : completedOvertimeToday ? (
                  <div className="bg-muted rounded-full py-4">
                    <span className="text-muted-foreground block text-center font-medium">
                      Lembur Hari Ini Selesai
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStartDrawerOpen(true)}
                    disabled={isPending}
                    className="bg-primary text-primary-foreground flex items-center justify-center gap-1.5 rounded-full py-4 font-semibold"
                  >
                    <Icon icon={Plus} size={18} tone="inverse" />
                    Ajukan Lembur
                  </button>
                )}
              </Card>
            )}
          </div>

          <MenuGrid role={user.role} />

          <div className="flex flex-col gap-3">
            <SectionHeader
              title="Absen Terakhir"
              count={recentAttendance.length}
              seeAllHref="/riwayat"
            />
            {recentAttendance.length === 0 ? (
              <Card className="px-4">
                <span className="text-muted-foreground block py-5 text-sm">
                  Belum ada absensi bulan ini.
                </span>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {recentAttendance.map((record) => (
                  <AttendanceCard key={record.date} record={record} />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SectionHeader
              title="Pengajuan Izin & Sakit"
              count={leaveRequestCards.length}
              seeAllHref="/izin"
            />
            <RequestListGroup
              items={leaveRequestCards}
              icon={FileText}
              emptyLabel="Belum ada pengajuan izin/sakit/cuti."
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionHeader
              title="Pengajuan Lembur"
              count={overtimeCards.length}
              seeAllHref="/lembur"
            />
            <RequestListGroup
              items={overtimeCards}
              icon={Timer}
              emptyLabel="Belum ada pengajuan lembur."
            />
          </div>

          <div className="flex flex-col gap-3">
            <SectionHeader
              title="Pengajuan Dinas Luar"
              count={fieldAssignmentCards.length}
              seeAllHref="/dinas-luar"
            />
            <RequestListGroup
              items={fieldAssignmentCards}
              icon={Briefcase}
              emptyLabel="Belum ada penugasan dinas luar."
            />
          </div>
        </div>
      </div>

      <MobileTabBar role={user.role} pendingReviewCount={pendingReviewCount} />

      <OvertimeStartDrawer
        open={startDrawerOpen}
        onClose={() => setStartDrawerOpen(false)}
        onStart={handleStartOvertime}
        submitting={isPending}
      />

      {runningOvertime && (
        <OvertimeEndDrawer
          open={endDrawerOpen}
          startedAtLabel={isoTime(runningOvertime.startAtIso)}
          submitting={isPending}
          onClose={() => setEndDrawerOpen(false)}
          onEnd={handleEndOvertime}
        />
      )}
    </div>
  );
}

function isoTime(iso: string) {
  return iso.slice(11, 16);
}

function lateLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}j ${minutes % 60}m` : `${minutes}m`;
}

function totalHoursLabel(fromHHmm: string, toHHmm: string) {
  const [fh, fm] = fromHHmm.split(":").map(Number);
  const [th, tm] = toHHmm.split(":").map(Number);
  const minutes = th * 60 + tm - (fh * 60 + fm);
  if (Number.isNaN(minutes) || minutes < 0) return "--:--";
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}
