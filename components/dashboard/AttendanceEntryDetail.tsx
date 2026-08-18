import { Badge } from "@/components/ui/badge";
import type { RecapEntry } from "@/lib/attendance";
import {
  APPROVAL_LABEL,
  APPROVAL_VARIANT,
  WORK_MODE_LABEL,
} from "@/lib/work-mode";

/**
 * Detail satu absensi (foto + status + koordinat). Dipakai dialog rekap admin
 * dan kalender karyawan, jadi sengaja tanpa `"use client"` supaya bisa dirender
 * dari server component juga.
 *
 * Absensi yang dicatat admin manual tidak punya foto maupun koordinat — bagian
 * itu diganti keterangan, bukan placeholder yang seolah-olah ada datanya.
 */
export default function AttendanceEntryDetail({
  entry,
}: {
  entry: RecapEntry;
}) {
  const hasCoords = entry.latitude !== null && entry.longitude !== null;
  const wasOverridden = entry.effectiveMode !== entry.workMode;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{entry.label}</p>
        <p className="text-sm tabular-nums">{entry.time}</p>
      </div>

      {entry.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.photoUrl}
          alt={`Foto ${entry.label}`}
          className="bg-muted aspect-4/3 w-full rounded-lg object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex aspect-4/3 w-full items-center justify-center rounded-lg px-4 text-center text-xs">
          Dicatat manual oleh admin — tidak ada foto absensi.
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">
          {WORK_MODE_LABEL[entry.effectiveMode]}
        </Badge>
        {entry.isManual && <Badge variant="outline">Dicatat manual</Badge>}
        {entry.isLate && <Badge variant="destructive">Terlambat</Badge>}
        {entry.isWithinRadius === true && (
          <Badge variant="outline">Dalam radius</Badge>
        )}
        {entry.isWithinRadius === false && (
          <Badge variant="outline">
            Di luar radius
            {entry.distanceLabel ? ` (${entry.distanceLabel})` : ""}
          </Badge>
        )}
        {entry.approvalStatus && (
          <Badge variant={APPROVAL_VARIANT[entry.approvalStatus]}>
            {APPROVAL_LABEL[entry.approvalStatus]}
          </Badge>
        )}
      </div>

      {entry.workModeDetail && (
        <p className="text-muted-foreground text-xs">
          Penjelasan karyawan: {entry.workModeDetail}
        </p>
      )}

      {wasOverridden && (
        <p className="text-muted-foreground text-xs">
          Diklaim sebagai {WORK_MODE_LABEL[entry.workMode]}, disetujui admin
          sebagai {WORK_MODE_LABEL[entry.effectiveMode]}.
        </p>
      )}

      {entry.reviewNote && (
        <p className="text-muted-foreground text-xs">
          Catatan admin: {entry.reviewNote}
        </p>
      )}

      {hasCoords && (
        <p className="text-muted-foreground text-xs">
          {entry.latitude!.toFixed(6)}, {entry.longitude!.toFixed(6)} ·{" "}
          <a
            className="underline"
            href={`https://www.google.com/maps?q=${entry.latitude},${entry.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            buka peta
          </a>
        </p>
      )}
    </div>
  );
}
