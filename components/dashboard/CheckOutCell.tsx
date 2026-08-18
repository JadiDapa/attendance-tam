import type { RecapEntry } from "@/lib/attendance";
import { cn } from "@/lib/utils";

/**
 * Kolom jam absensi. Tiga keadaan yang gampang tertukar dibedakan eksplisit:
 * absensi yang menggantung (tidak pernah absen pulang di hari yang sudah lewat),
 * absensi yang ditolak admin, dan absensi yang masih menunggu approval.
 */
export default function CheckOutCell({
  entry,
  missing,
}: {
  entry: RecapEntry | null;
  missing: boolean;
}) {
  if (entry) {
    const voided = entry.approvalStatus === "REJECTED";

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
            ditolak
          </span>
        )}
        {!voided && entry.isManual && (
          <span className="text-muted-foreground ml-1 text-xs">manual</span>
        )}
        {!voided && entry.approvalStatus === "PENDING" && (
          <span className="text-muted-foreground ml-1 text-xs">
            menunggu approval
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
