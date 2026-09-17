"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Clock,
  FileText,
  Timer,
  CheckCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/mobile/icon";
import { NotificationBadge } from "@/components/mobile/notification-badge";
import type { Role } from "@/generated/prisma";

type TabKey =
  | "beranda"
  | "histori"
  | "izin"
  | "lembur"
  | "approval"
  | "profile";

const TAB_META: Record<
  TabKey,
  { label: string; href: string; icon: LucideIcon }
> = {
  beranda: { label: "Beranda", href: "/dashboard", icon: Home },
  histori: { label: "Histori", href: "/riwayat", icon: Clock },
  izin: { label: "Izin", href: "/izin", icon: FileText },
  lembur: { label: "Lembur", href: "/lembur", icon: Timer },
  approval: { label: "Review", href: "/approval", icon: CheckCheck },
  profile: { label: "Profile", href: "/pengaturan", icon: User },
};

const TAB_ORDER: TabKey[] = [
  "beranda",
  "histori",
  "izin",
  "lembur",
  "approval",
  "profile",
];

/** Mirrors mobile's role gate: Review tab only for SUPERVISOR/MANAGER, ADMIN doesn't get it either. */
const ROLE_ONLY_TABS: Partial<Record<TabKey, Role[]>> = {
  approval: ["SUPERVISOR", "MANAGER"],
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({
  role,
  pendingReviewCount = 0,
}: {
  role?: Role;
  pendingReviewCount?: number;
}) {
  const pathname = usePathname();

  const tabs = TAB_ORDER.filter((key) => {
    const allowedRoles = ROLE_ONLY_TABS[key];
    return !allowedRoles || (role && allowedRoles.includes(role));
  });

  return (
    <nav
      className="border-border bg-background fixed inset-x-0 bottom-0 z-50 flex items-start justify-between border-t px-2 pt-2 md:hidden"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      {tabs.map((key) => {
        const meta = TAB_META[key];
        const active = isActive(pathname, meta.href);

        return (
          <Link
            key={key}
            href={meta.href}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span
              className={cn(
                "relative flex items-center justify-center px-4 py-1.5",
                active && "bg-background rounded-full",
              )}
            >
              <Icon
                icon={meta.icon}
                size={22}
                tone={active ? "primary" : "muted"}
              />
              {key === "approval" && (
                <NotificationBadge count={pendingReviewCount} />
              )}
            </span>
            <span
              className={cn(
                "line-clamp-1 text-[10px]",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground font-medium",
              )}
            >
              {meta.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
