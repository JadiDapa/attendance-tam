export type MonthGroup<T> = {
  key: string;
  label: string;
  pending: T[];
  reviewed: T[];
};

function monthKey(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function monthLabel(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Groups items (already sorted by date, most recent first) into month
 * buckets, splitting each bucket into still-pending vs already-reviewed
 * items so the UI can show a gap between the two within the same month.
 * Mirrors `mobile/src/lib/group-by-month.ts`.
 */
export function groupByMonthWithReviewGap<T>(
  items: T[],
  getDate: (item: T) => string,
  isPending: (item: T) => boolean,
): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>();

  for (const item of items) {
    const date = getDate(item);
    const key = monthKey(date);

    let group = groups.get(key);
    if (!group) {
      group = { key, label: monthLabel(date), pending: [], reviewed: [] };
      groups.set(key, group);
    }

    if (isPending(item)) group.pending.push(item);
    else group.reviewed.push(item);
  }

  return [...groups.values()];
}
