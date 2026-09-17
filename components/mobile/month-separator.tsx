/** Mirrors mobile's `MonthSeparator`. */
export function MonthSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-foreground text-sm font-bold">{label}</span>
      <div className="bg-border h-px flex-1" />
    </div>
  );
}
