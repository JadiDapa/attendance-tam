import { Badge } from "@/components/ui/badge";
import type { RecapEntry } from "@/lib/attendance";
import { APPROVAL_LABEL, WORK_MODE_LABEL } from "@/lib/work-mode";

/**
 * Ringkasan lokasi satu hari dari absen masuk + pulang.
 *
 * Absensi yang dicatat admin manual tidak punya koordinat, jadi tidak boleh
 * ikut dihitung "di luar radius" — kalau semua entry-nya manual, yang
 * ditampilkan adalah keterangannya, bukan status radius.
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
        <Badge variant="outline">
          {WORK_MODE_LABEL[outside.effectiveMode]}
          {outside.distanceLabel ? ` · ${outside.distanceLabel}` : ""}
        </Badge>
        {outside.approvalStatus && (
          <p className="text-muted-foreground text-xs">
            {APPROVAL_LABEL[outside.approvalStatus]}
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
