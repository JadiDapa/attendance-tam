"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { Icon } from "@/components/mobile/icon";
import { NotificationBadge } from "@/components/mobile/notification-badge";

/**
 * Mirrors the mobile app's Stack header pattern used by every non-Beranda
 * tab: back arrow left, centered title, notification bell right.
 * (`mobile/src/app/(tabs)/(histori)/_layout.tsx` etc.)
 */
export function MobilePageHeader({
  title,
  pendingReviewCount = 0,
  showBack = false,
}: {
  title: string;
  pendingReviewCount?: number;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <header className="border-border bg-background sticky top-0 z-40 flex h-14 items-center justify-between border-b px-4 md:hidden">
      <span className="flex w-10 items-center">
        {showBack && (
          <button onClick={() => router.back()} aria-label="Kembali">
            <Icon icon={ArrowLeft} size={24} />
          </button>
        )}
      </span>

      <h1 className="text-foreground text-base font-bold">{title}</h1>

      <span className="flex w-10 items-center justify-end">
        <Link href="/notifikasi" className="relative" aria-label="Notifikasi">
          <Icon icon={Bell} size={24} />
          <NotificationBadge count={pendingReviewCount} />
        </Link>
      </span>
    </header>
  );
}
