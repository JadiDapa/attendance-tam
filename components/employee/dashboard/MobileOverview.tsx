import type { ReactNode } from "react";
import { CalendarDays, LogIn, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import AttendanceDialog from "@/components/employee/AttendanceDialog";
import { AttendanceType } from "@/generated/prisma";
import type { RecapEntry } from "@/lib/attendance";
import { WORK_MODE_LABEL } from "@/lib/work-mode";
import { parseTimeToMinutes } from "@/lib/date";

type OfficeLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
};

type Props = {
  greeting: string;
  name: string;
  photoUrl: string | null;
  weekdayLabel: string;
  shortDateLabel: string;
  checkIn: RecapEntry | null;
  checkOut: RecapEntry | null;
  checkInScheduled: string | null;
  checkOutScheduled: string | null;
  office: OfficeLocation | null;
  maxAccuracyMeters: number;
  faceEnrolled: boolean;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Menit keterlambatan dari jam masuk terjadwal — null kalau tidak terlambat. */
function lateMinutes(entry: RecapEntry | null, scheduled: string | null) {
  if (!entry?.isLate || !scheduled) return null;

  const start = parseTimeToMinutes(scheduled);
  const actual = parseTimeToMinutes(entry.time);

  if (start === null || actual === null || actual <= start) return null;

  return actual - start;
}

function Row({
  icon,
  title,
  entry,
  scheduled,
  disabled,
  disabledReason,
  type,
  office,
  maxAccuracyMeters,
}: {
  icon: ReactNode;
  title: string;
  entry: RecapEntry | null;
  scheduled: string | null;
  disabled: boolean;
  disabledReason?: string;
  type: AttendanceType;
  office: OfficeLocation | null;
  maxAccuracyMeters: number;
}) {
  const minutesLate = lateMinutes(entry, scheduled);

  const row = (
    <button
      type="button"
      disabled={disabled || !office}
      title={disabled ? disabledReason : undefined}
      className="flex w-full items-start justify-between gap-3 py-4 text-left transition-colors enabled:hover:bg-muted/30 disabled:cursor-not-allowed"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="bg-primary/15 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className="text-3xl leading-tight font-bold tracking-tight tabular-nums">
            {entry ? entry.time : "--.--"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Mulai {scheduled ?? "--:--"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pt-1">
        <span className="text-muted-foreground text-right text-xs whitespace-nowrap">
          {entry ? "Berhasil absen" : "Belum absen"}
        </span>
        {entry ? (
          minutesLate ? (
            <Badge variant="destructive">Terlambat {minutesLate} Menit</Badge>
          ) : (
            <Badge variant="secondary">
              {WORK_MODE_LABEL[entry.effectiveMode]}
            </Badge>
          )
        ) : (
          <Badge variant="outline">n/a</Badge>
        )}
      </div>
    </button>
  );

  if (!office || entry) return row;

  return (
    <AttendanceDialog
      type={type}
      label={title}
      disabled={disabled}
      disabledReason={disabledReason}
      maxAccuracyMeters={maxAccuracyMeters}
      office={office}
      trigger={row}
    />
  );
}

/** Layout dashboard karyawan khusus mobile — kartu ringkas pengganti grid desktop. */
export default function MobileOverview({
  greeting,
  name,
  photoUrl,
  weekdayLabel,
  shortDateLabel,
  checkIn,
  checkOut,
  checkInScheduled,
  checkOutScheduled,
  office,
  maxAccuracyMeters,
  faceEnrolled,
}: Props) {
  const canAttend = office !== null && faceEnrolled;
  const checkInDisabled = !canAttend || !!checkIn;
  const checkOutDisabled = !canAttend || !checkIn || !!checkOut;

  return (
    <div className="-mx-4 -mt-4 flex flex-col lg:hidden">
      <div className="bg-primary text-primary-foreground rounded-b-[2.5rem] px-6 pt-8 pb-24">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-primary-foreground/80 text-base">
              {greeting},
            </p>
            <p className="truncate text-[28px] leading-tight font-bold tracking-tight">
              {name}
            </p>
            <p className="text-primary-foreground/70 mt-2 text-sm">
              Ayo produktif hari ini!
            </p>
          </div>

          <Avatar className="ring-primary-foreground/30 size-12 shrink-0 ring-2">
            {photoUrl && <AvatarImage src={photoUrl} alt={name} />}
            <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground text-base font-semibold">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="bg-card border-border -mt-16 flex flex-col rounded-[2rem] border px-5 pt-5 pb-2 shadow-lg">
        <div className="flex items-center justify-between gap-2 pb-4">
          <h2 className="text-lg font-semibold">Ringkasan</h2>

          <div className="flex flex-col items-end gap-1">
            <span className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
              <CalendarDays className="size-3.5" />
              {weekdayLabel}
            </span>
            <span className="text-muted-foreground text-xs">
              {shortDateLabel}
            </span>
          </div>
        </div>

        <div className="divide-border/70 flex flex-col divide-y">
          <Row
            icon={<LogIn className="size-4.5" />}
            title="Absen Masuk"
            entry={checkIn}
            scheduled={checkInScheduled}
            disabled={checkInDisabled}
            disabledReason={
              !faceEnrolled
                ? "Daftarkan wajah di Profil dulu"
                : checkIn
                  ? "Sudah absen masuk hari ini"
                  : undefined
            }
            type={AttendanceType.CHECK_IN}
            office={office}
            maxAccuracyMeters={maxAccuracyMeters}
          />

          <Row
            icon={<LogOut className="size-4.5" />}
            title="Absen Pulang"
            entry={checkOut}
            scheduled={checkOutScheduled}
            disabled={checkOutDisabled}
            disabledReason={
              !faceEnrolled
                ? "Daftarkan wajah di Profil dulu"
                : !checkIn
                  ? "Absen masuk dulu"
                  : checkOut
                    ? "Sudah absen pulang hari ini"
                    : undefined
            }
            type={AttendanceType.CHECK_OUT}
            office={office}
            maxAccuracyMeters={maxAccuracyMeters}
          />
        </div>
      </div>
    </div>
  );
}
