import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck,
  LogIn,
  LogOut,
  ScanFace,
} from "lucide-react";
import Panel from "@/components/dashboard/Panel";
import AttendanceDialog from "@/components/employee/AttendanceDialog";
import { Badge } from "@/components/ui/badge";
import { AttendanceType } from "@/generated/prisma";
import type { RecapEntry } from "@/lib/attendance";
import { APPROVAL_LABEL, WORK_MODE_LABEL } from "@/lib/work-mode";
import { cn } from "@/lib/utils";

type Props = {
  dateLabel: string;
  checkIn: RecapEntry | null;
  checkOut: RecapEntry | null;
  /** Null kalau admin belum mengatur lokasi kantor — absensi belum bisa jalan. */
  office: { latitude: number; longitude: number; radiusMeters: number } | null;
  maxAccuracyMeters: number;
  /** False kalau karyawan belum menyelesaikan pendaftaran wajah di Profil. */
  faceEnrolled: boolean;
};

function Slot({
  title,
  icon,
  entry,
}: {
  title: string;
  icon: React.ReactNode;
  entry: RecapEntry | null;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col gap-2 rounded-xl border p-4",
        entry ? "bg-muted/40" : "bg-card",
      )}
    >
      <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
        {icon}
        {title}
      </p>

      <p className="text-3xl font-bold tracking-tight tabular-nums">
        {entry ? entry.time : "--:--"}
      </p>

      {entry ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {WORK_MODE_LABEL[entry.effectiveMode]}
            </Badge>
            {entry.isManual && <Badge variant="outline">Dicatat manual</Badge>}
            {entry.isLate && <Badge variant="destructive">Terlambat</Badge>}
            {entry.approvalStatus && (
              <Badge
                variant={
                  entry.approvalStatus === "REJECTED"
                    ? "destructive"
                    : "outline"
                }
              >
                {APPROVAL_LABEL[entry.approvalStatus]}
              </Badge>
            )}
          </div>
          {entry.isWithinRadius === false && entry.distanceLabel && (
            <p className="text-muted-foreground text-xs">
              {entry.distanceLabel} dari kantor
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Belum absen</p>
      )}
    </div>
  );
}

export default function TodayAttendance({
  dateLabel,
  checkIn,
  checkOut,
  office,
  maxAccuracyMeters,
  faceEnrolled,
}: Props) {
  const canAttend = office !== null && faceEnrolled;

  return (
    <Panel
      title="Absensi Hari Ini"
      icon={CalendarCheck}
      action={
        <span className="text-muted-foreground shrink-0 text-sm">
          {dateLabel}
        </span>
      }
      className="flex flex-2 flex-col p-4"
    >
      {!office && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Lokasi kantor belum diatur admin, absensi belum bisa dilakukan.
        </div>
      )}

      {office && !faceEnrolled && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
          <ScanFace className="mt-0.5 size-4 shrink-0" />
          <span>
            Wajah kamu belum terdaftar.{" "}
            <Link href="/profil" className="font-medium underline">
              Daftarkan wajah di halaman Profil
            </Link>{" "}
            sebelum bisa absen.
          </span>
        </div>
      )}

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <Slot
          title="Absen Masuk"
          icon={<LogIn className="size-4" />}
          entry={checkIn}
        />
        <Slot
          title="Absen Pulang"
          icon={<LogOut className="size-4" />}
          entry={checkOut}
        />
      </div>

      {office && (
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <AttendanceDialog
            type={AttendanceType.CHECK_IN}
            label="Absen Masuk"
            disabled={!canAttend || !!checkIn}
            disabledReason={
              !faceEnrolled
                ? "Daftarkan wajah di Profil dulu"
                : checkIn
                  ? "Sudah absen masuk hari ini"
                  : undefined
            }
            maxAccuracyMeters={maxAccuracyMeters}
            office={office}
          />
          <AttendanceDialog
            type={AttendanceType.CHECK_OUT}
            label="Absen Pulang"
            disabled={!canAttend || !checkIn || !!checkOut}
            disabledReason={
              !faceEnrolled
                ? "Daftarkan wajah di Profil dulu"
                : !checkIn
                  ? "Absen masuk dulu"
                  : checkOut
                    ? "Sudah absen pulang hari ini"
                    : undefined
            }
            maxAccuracyMeters={maxAccuracyMeters}
            office={office}
          />
        </div>
      )}
    </Panel>
  );
}
