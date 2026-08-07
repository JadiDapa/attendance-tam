import { Badge } from "@/components/ui/badge";
import type { RecapEntry } from "@/lib/attendance";
import { RADIUS_REVIEW_LABEL } from "@/lib/radius-review";

/**
 * Ringkasan lokasi satu hari dari absen masuk + pulang.
 *
 * Absensi hasil koreksi manual tidak punya koordinat, jadi tidak boleh ikut
 * dihitung "di luar radius" — kalau semua entry-nya manual, yang ditampilkan
 * adalah keterangannya, bukan status radius.
 */
export default function AttendanceLocationBadge({
  entries,
}: {
  entries: (RecapEntry | null)[];
}) {
  const present = entries.filter((entry) => entry !== null);

  if (!present.length) return <span>—</span>;

  const outside = present.find((entry) => entry.isWithinRadius === false);

  if (outside) {
    return (
      <div className="space-y-1">
        <Badge variant="destructive">
          Di luar radius
          {outside.distanceLabel ? ` (${outside.distanceLabel})` : ""}
        </Badge>
        {outside.reviewStatus && (
          <p className="text-muted-foreground text-xs">
            {RADIUS_REVIEW_LABEL[outside.reviewStatus]}
          </p>
        )}
      </div>
    );
  }

  if (present.some((entry) => entry.isWithinRadius === true)) {
    return <Badge variant="secondary">Dalam radius</Badge>;
  }

  return <Badge variant="outline">Tanpa lokasi</Badge>;
}
