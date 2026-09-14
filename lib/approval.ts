import { AttendanceApproval } from "@/generated/prisma";

/** Label & varian badge generik untuk status `AttendanceApproval` — dipakai
 * lembur dan dinas luar, dua fitur yang sama-sama reuse enum ini. */
export const APPROVAL_STATUS_LABEL: Record<AttendanceApproval, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const APPROVAL_STATUS_VARIANT: Record<
  AttendanceApproval,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};
