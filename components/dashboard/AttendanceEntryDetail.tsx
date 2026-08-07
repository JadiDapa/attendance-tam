import { Badge } from "@/components/ui/badge";
import type { RecapEntry } from "@/lib/attendance";
import {
  RADIUS_REVIEW_LABEL,
  RADIUS_REVIEW_VARIANT,
} from "@/lib/radius-review";

/**
 * Detail satu absensi (foto + status + koordinat). Dipakai dialog rekap admin
 * dan kalender karyawan, jadi sengaja tanpa `"use client"` supaya bisa dirender
 * dari server component juga.
 *
 * Absensi hasil koreksi manual tidak punya foto maupun koordinat — bagian itu
 * diganti keterangan, bukan placeholder yang seolah-olah ada datanya.
 */
export default function AttendanceEntryDetail({
  entry,
}: {
  entry: RecapEntry;
}) {
  const hasCoords = entry.latitude !== null && entry.longitude !== null;

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
          Dicatat manual lewat koreksi — tidak ada foto absensi.
        </div>
      )}

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
        {entry.reviewStatus && (
          <Badge variant={RADIUS_REVIEW_VARIANT[entry.reviewStatus]}>
            {RADIUS_REVIEW_LABEL[entry.reviewStatus]}
          </Badge>
        )}
      </div>

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
