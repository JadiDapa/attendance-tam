import { z } from "zod";
import { fromDateInputValue } from "@/lib/date";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

export const ReportQuerySchema = z.object({
  start: z.string().regex(DATE_INPUT, "Tanggal mulai tidak valid"),
  end: z.string().regex(DATE_INPUT, "Tanggal selesai tidak valid"),
  userId: z.string().optional(),
  mode: z.enum(["all", "activity"]).default("all"),
});

export type ReportQueryDTO = z.infer<typeof ReportQuerySchema>;

export type ResolvedReportQuery = {
  startDate: Date;
  endDate: Date;
  userId?: string;
  mode: "all" | "activity";
};

/** Ubah query mentah jadi rentang tanggal yang aman dipakai query database. */
export function resolveReportQuery(
  input: unknown,
): { ok: true; value: ResolvedReportQuery } | { ok: false; error: string } {
  const parsed = ReportQuerySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Filter laporan tidak valid",
    };
  }

  const startDate = fromDateInputValue(parsed.data.start);
  const endDate = fromDateInputValue(parsed.data.end);

  if (!startDate || !endDate) {
    return { ok: false, error: "Tanggal laporan tidak valid" };
  }

  if (startDate > endDate) {
    return { ok: false, error: "Tanggal mulai melewati tanggal selesai" };
  }

  const days =
    (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000) + 1;

  if (days > MAX_RANGE_DAYS) {
    return { ok: false, error: `Rentang maksimal ${MAX_RANGE_DAYS} hari` };
  }

  return {
    ok: true,
    value: {
      startDate,
      endDate,
      userId: parsed.data.userId || undefined,
      mode: parsed.data.mode,
    },
  };
}
