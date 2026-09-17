/** Mirrors mobile's `ReviewedDivider`. */
export function ReviewedDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs">Sudah direview</span>
      <div className="bg-border h-px flex-1" />
    </div>
  );
}
