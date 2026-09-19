import { AttendanceService } from "@/servers/services/attendance.service";
import { FaceService } from "@/servers/services/face.service";
import { LeaveService } from "@/servers/services/leave.service";
import { OvertimeService } from "@/servers/services/overtime.service";
import { FieldAssignmentService } from "@/servers/services/field-assignment.service";
import {
  OfficeLocationService,
  WorkDayService,
} from "@/servers/services/setting.service";
import { NotificationService } from "@/servers/services/notification.service";
import { formatTime, getMinutesOfDay, getWorkDate } from "@/lib/date";
import { getWorkDayFor, isCheckInClosed } from "@/lib/work-schedule";
import { LEAVE_TYPE_LABEL } from "@/lib/leave";
import { APPROVAL_STATUS_LABEL } from "@/lib/approval";
import type { User } from "@/generated/prisma";
import { HomeScreen } from "@/components/mobile/beranda/home-screen";
import type {
  RequestStatus,
  SummaryRequest,
} from "@/components/mobile/beranda/request-card";
import type { DayRecord } from "@/components/mobile/histori/attendance-card";

const LEAVE_STATUS_TO_REQUEST_STATUS: Record<string, RequestStatus> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

/** Server data-fetching wrapper for the mobile Beranda (home) screen — reuses the same services `SelfAttendanceDashboard` uses, no separate API round-trip. */
export async function MobileHome({ user }: { user: User }) {
  const today = getWorkDate();

  const [
    todayStatus,
    workDays,
    office,
    faceEnrolled,
    recentLeave,
    recentOvertime,
    recentFieldAssignment,
    badges,
  ] = await Promise.all([
    AttendanceService.getTodayStatus(user.id, today),
    WorkDayService.list(),
    OfficeLocationService.getActive(),
    FaceService.isEnrolled(user.id),
    LeaveService.list({ userId: user.id }),
    OvertimeService.list({ userId: user.id }),
    FieldAssignmentService.list({ employeeId: user.id }),
    NotificationService.forUser(user),
  ]);

  const todaySchedule = getWorkDayFor(today, workDays);
  const checkInClosed = isCheckInClosed(
    getMinutesOfDay(new Date()),
    todaySchedule,
  );
  const pendingReviewCount = Object.values(badges).reduce(
    (sum, n) => sum + n,
    0,
  );

  const recentAttendanceRows = await AttendanceService.listGroupedByDate(
    user.id,
    {
      startDate: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
      endDate: today,
    },
  );

  const recentAttendance: DayRecord[] = recentAttendanceRows
    .filter((d) => d.checkIn)
    .slice(0, 3)
    .map((d) => ({
      date: d.workDate.toISOString().slice(0, 10),
      location: d.checkIn
        ? d.checkIn.isWithinRadius === false
          ? "Luar Radius"
          : "Hadir di Kantor"
        : "-",
      status: "Hadir",
      isLate: d.checkIn?.isLate ?? false,
      lateBy:
        d.checkIn && d.checkIn.lateMinutes > 0
          ? `${d.checkIn.lateMinutes}m`
          : null,
      checkIn: d.checkIn
        ? formatTime(d.checkIn.timestamp)
        : null,
      checkOut: d.checkOut
        ? formatTime(d.checkOut.timestamp)
        : null,
      totalHours:
        d.checkIn && d.checkOut
          ? formatHoursBetween(d.checkIn.timestamp, d.checkOut.timestamp)
          : "--:--",
    }));

  const leaveRequestCards: SummaryRequest[] = recentLeave
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      subtitle: LEAVE_TYPE_LABEL[item.type],
      title: item.detail,
      date: item.startDate.toISOString(),
      status: LEAVE_STATUS_TO_REQUEST_STATUS[item.status] ?? "Menunggu",
    }));

  const overtimeCards: SummaryRequest[] = recentOvertime
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: item.reason,
      date: item.startAt.toISOString(),
      status:
        (APPROVAL_STATUS_LABEL[item.status] as RequestStatus) ?? "Menunggu",
    }));

  const fieldAssignmentCards: SummaryRequest[] = recentFieldAssignment
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      title: item.activityDetail,
      date: item.startDate.toISOString(),
      status:
        (APPROVAL_STATUS_LABEL[item.status] as RequestStatus) ?? "Menunggu",
    }));

  const todaysOvertime = recentOvertime.filter(
    (item) =>
      item.startAt.toISOString().slice(0, 10) ===
        today.toISOString().slice(0, 10) && item.status !== "REJECTED",
  );
  const runningOvertime =
    todaysOvertime.find((item) => item.endAt === null) ?? null;
  const completedOvertimeToday = runningOvertime
    ? null
    : (todaysOvertime.find((item) => item.endAt !== null) ?? null);

  return (
    <HomeScreen
      user={{
        name: user.name,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      }}
      pendingReviewCount={pendingReviewCount}
      officeLocationName={office?.name ?? null}
      checkIn={
        todayStatus.checkIn
          ? {
              time: formatTime(todayStatus.checkIn.timestamp),
              isLate: todayStatus.checkIn.isLate,
              lateMinutes: todayStatus.checkIn.lateMinutes,
            }
          : null
      }
      checkOut={
        todayStatus.checkOut
          ? { time: formatTime(todayStatus.checkOut.timestamp) }
          : null
      }
      checkInClosed={checkInClosed}
      faceEnrolled={faceEnrolled}
      runningOvertime={
        runningOvertime
          ? {
              id: runningOvertime.id,
              startAtIso: runningOvertime.startAt.toISOString(),
            }
          : null
      }
      completedOvertimeToday={
        completedOvertimeToday
          ? {
              startAtIso: completedOvertimeToday.startAt.toISOString(),
              endAtIso: completedOvertimeToday.endAt?.toISOString() ?? null,
              statusLabel: APPROVAL_STATUS_LABEL[completedOvertimeToday.status],
            }
          : null
      }
      recentAttendance={recentAttendance}
      leaveRequestCards={leaveRequestCards}
      overtimeCards={overtimeCards}
      fieldAssignmentCards={fieldAssignmentCards}
    />
  );
}

function formatHoursBetween(from: Date, to: Date): string {
  const minutes = Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  return `${hours}j ${minutes % 60}m`;
}
