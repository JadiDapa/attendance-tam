"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarIcon as CalendarClock,
  FileTextIcon as FileText,
  FaceIcon as Fingerprint,
  GearIcon as Settings,
  PersonIcon as UserRound,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string }>;

type NavItem = { title: string; url: string; icon: Icon };

const leftItems: NavItem[] = [
  { title: "Riwayat", url: "/riwayat", icon: CalendarClock },
  { title: "Izin & Cuti", url: "/izin", icon: FileText },
];

const rightItems: NavItem[] = [
  { title: "Profil", url: "/profil", icon: UserRound },
  { title: "Setting", url: "/pengaturan", icon: Settings },
];

const centerItem: NavItem = {
  title: "Absensi",
  url: "/dashboard",
  icon: Fingerprint,
};

function isActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.url}
      className="flex flex-1 flex-col items-center justify-center gap-1"
    >
      <item.icon
        className={cn(
          "size-5 shrink-0 transition-colors",
          active ? "text-primary-subtle" : "text-muted-foreground",
        )}
      />
      <span
        className={cn(
          "text-[10px] leading-none font-medium transition-colors",
          active ? "text-primary-subtle" : "text-muted-foreground",
        )}
      >
        {item.title}
      </span>
    </Link>
  );
}

/** Bottom pill navigation untuk viewport mobile/tablet (khusus karyawan). */
export default function BottomNav() {
  const pathname = usePathname();
  const centerActive = isActive(pathname, centerItem.url);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="bg-card mx-4 mb-4 flex h-16 items-center rounded-full px-3 shadow-lg">
        {leftItems.map((item) => (
          <NavLink
            key={item.url}
            item={item}
            active={isActive(pathname, item.url)}
          />
        ))}

        <Link
          href={centerItem.url}
          className="flex flex-1 flex-col items-center justify-center"
        >
          <span
            className={cn(
              "bg-primary text-primary-foreground ring-background -mt-9 flex size-14 items-center justify-center rounded-full shadow-lg ring-4 transition-transform active:scale-95",
              centerActive && "ring-primary/30",
            )}
          >
            <centerItem.icon className="size-6" />
          </span>
        </Link>

        {rightItems.map((item) => (
          <NavLink
            key={item.url}
            item={item}
            active={isActive(pathname, item.url)}
          />
        ))}
      </div>
    </nav>
  );
}
