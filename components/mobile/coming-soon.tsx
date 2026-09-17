import { MobilePageHeader } from "@/components/mobile/page-header";
import { MobileTabBar } from "@/components/mobile/tab-bar";
import type { Role } from "@/generated/prisma";

/**
 * Placeholder for a mobile-parity screen not yet built (see `MOBILE_PARITY.md`
 * build order). Keeps the route resolving (no 404) and the shell consistent
 * while the real screen is pending its scheduled slot.
 */
export function MobileComingSoon({
  title,
  role,
  pendingReviewCount = 0,
}: {
  title: string;
  role: Role;
  pendingReviewCount?: number;
}) {
  return (
    <div className="bg-background -mx-4 -mt-4 -mb-28 flex min-h-[calc(100dvh-3.5rem)] flex-col md:hidden">
      <MobilePageHeader
        title={title}
        showBack
        pendingReviewCount={pendingReviewCount}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-20 text-center">
        <p className="text-foreground text-base font-semibold">Segera hadir</p>
        <p className="text-muted-foreground text-sm">
          Halaman ini sedang dalam pengembangan mengikuti tampilan aplikasi
          mobile.
        </p>
      </div>
      <MobileTabBar role={role} pendingReviewCount={pendingReviewCount} />
    </div>
  );
}
