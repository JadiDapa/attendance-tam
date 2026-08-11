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
import { cn } from "@/lib/utils";

type Props = {
  dateLabel: string;
  checkIn: RecapEntry | null;
  checkOut: RecapEntry | null;
  /** Null kalau admin belum mengatur lokasi kantor — absensi belum bisa jalan. */
  hasOffice: boolean;
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
        <div className="flex flex-wrap gap-1.5">
          {entry.isManual && <Badge variant="outline">Koreksi manual</Badge>}
          {entry.isLate && <Badge variant="destructive">Terlambat</Badge>}
          {entry.isWithinRadius === true && (
            <Badge variant="secondary">Dalam radius</Badge>
          )}
          {entry.isWithinRadius === false && (
            <Badge variant="destructive">
              Di luar radius
              {entry.distanceLabel ? ` (${entry.distanceLabel})` : ""}
            </Badge>
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
  hasOffice,
  maxAccuracyMeters,
  faceEnrolled,
}: Props) {
  return (
    <Panel
      title="Absensi Hari Ini"
      icon={CalendarCheck}
      action={
        <span className="text-muted-foreground shrink-0 text-sm">
          {dateLabel}
        </span>
      }
      className="flex flex-1 flex-col p-4"
    >
      {!hasOffice && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Lokasi kantor belum diatur admin, absensi belum bisa dilakukan.
        </div>
      )}

      {hasOffice && !faceEnrolled && (
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

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        <AttendanceDialog
          type={AttendanceType.CHECK_IN}
          label="Absen Masuk"
          disabled={!hasOffice || !faceEnrolled || !!checkIn}
          disabledReason={
            !faceEnrolled
              ? "Daftarkan wajah di Profil dulu"
              : checkIn
                ? "Sudah absen masuk hari ini"
                : undefined
          }
          maxAccuracyMeters={maxAccuracyMeters}
        />
        <AttendanceDialog
          type={AttendanceType.CHECK_OUT}
          label="Absen Pulang"
          disabled={!hasOffice || !faceEnrolled || !checkIn || !!checkOut}
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
        />
      </div>
    </Panel>
  );
}
