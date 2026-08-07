import type { RecapEntry } from "@/lib/attendance";
import { cn } from "@/lib/utils";

/**
 * Kolom jam absensi. Dua keadaan yang gampang tertukar dibedakan eksplisit:
 * absensi yang menggantung (tidak pernah absen pulang di hari yang sudah lewat)
 * dan absensi yang dianulir admin lewat verifikasi lokasi.
 */
export default function CheckOutCell({
  entry,
  missing,
}: {
  entry: RecapEntry | null;
  missing: boolean;
}) {
  if (entry) {
    const voided = entry.reviewStatus === "ALPA";

    return (
      <span
        className={cn(
          "tabular-nums",
          voided && "text-muted-foreground line-through",
        )}
      >
        {entry.time}
        {voided && (
          <span className="text-muted-foreground ml-1 text-xs no-underline">
            dianulir
          </span>
        )}
        {!voided && entry.isManual && (
          <span className="text-muted-foreground ml-1 text-xs">manual</span>
        )}
        {!voided && entry.reviewStatus === "PENDING" && (
          <span className="text-destructive ml-1 text-xs">
            perlu verifikasi
          </span>
        )}
      </span>
    );
  }

  if (missing) {
    return <span className="text-destructive text-xs">Tidak absen pulang</span>;
  }

  return <span className="tabular-nums">—</span>;
}
