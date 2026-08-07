import { LeaveStatus, LeaveType } from "@/generated/prisma";

export const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  IZIN: "Izin",
  SAKIT: "Sakit",
  CUTI: "Cuti",
};

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const LEAVE_STATUS_VARIANT: Record<
  LeaveStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "outline",
  APPROVED: "default",
  REJECTED: "destructive",
};

/** Jumlah hari pengajuan (inklusif). Kedua tanggal adalah kolom `date` UTC. */
export function countLeaveDays(startDate: Date, endDate: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;

  return Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
}
