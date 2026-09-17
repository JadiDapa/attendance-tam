import { z } from "zod";
import { fromDateInputValue } from "@/lib/date";

const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_INPUT = /^\d{4}-\d{2}$/;

export const AdminRecapQuerySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("daily"),
    date: z.string().regex(DATE_INPUT, "Tanggal tidak valid"),
  }),
  z.object({
    mode: z.literal("monthly"),
    month: z.string().regex(MONTH_INPUT, "Bulan tidak valid"),
  }),
]);

export type ResolvedAdminRecapQuery =
  | { mode: "daily"; date: Date }
  | { mode: "monthly"; startDate: Date; endDate: Date };

/** Ubah query mentah jadi tanggal (mode harian) atau rentang satu bulan penuh (mode bulanan). */
export function resolveAdminRecapQuery(
  input: unknown,
): { ok: true; value: ResolvedAdminRecapQuery } | { ok: false; error: string } {
  const parsed = AdminRecapQuerySchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Filter rekap tidak valid",
    };
  }

  if (parsed.data.mode === "daily") {
    const date = fromDateInputValue(parsed.data.date);

    if (!date) return { ok: false, error: "Tanggal tidak valid" };

    return { ok: true, value: { mode: "daily", date } };
  }

  const [yearStr, monthStr] = parsed.data.month.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  // Hari ke-0 bulan berikutnya = hari terakhir bulan ini.
  const endDate = new Date(Date.UTC(year, month, 0));

  return { ok: true, value: { mode: "monthly", startDate, endDate } };
}
