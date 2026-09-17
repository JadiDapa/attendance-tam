/** Small red count badge, absolutely positioned over an icon. Mirrors mobile's `NotificationBadge`. */
export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  const label = count > 99 ? "99+" : String(count);

  return (
    <span className="bg-destructive text-destructive-foreground absolute -top-1.5 -right-1.5 flex min-w-4.5 items-center justify-center rounded-full px-1 py-0.5 text-[10px] leading-none font-bold">
      {label}
    </span>
  );
}
