"use client";

import {
  BellIcon as Bell,
  ChevronDownIcon as ChevronDown,
  ExitIcon as LogOut,
  PersonIcon as User,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { SidebarTrigger } from "../ui/sidebar";
import { usePathname } from "next/navigation";
import { Role, User as UserType } from "@/generated/prisma";
import { ToggleTheme } from "./ToggleTheme";
import SidebarSearch from "./SidebarSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  filterMenuByRole,
  getPageTitle,
  overviewItems,
  settingsItems,
} from "@/lib/sidebar-menu";
import { cn } from "@/lib/utils";

export default function Navbar({
  user,
  badges,
}: {
  user: UserType;
  /** Jumlah item yang perlu ditindak, dipetakan per URL menu sidebar. */
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  const isEmployee = user.role === Role.EMPLOYEE;
  const title = getPageTitle(pathname, user.role);

  const searchGroups = [
    { label: "Menu", items: filterMenuByRole(overviewItems, user.role) },
    { label: "Lainnya", items: filterMenuByRole(settingsItems, user.role) },
  ];

  const notifications = filterMenuByRole(
    [...overviewItems, ...settingsItems],
    user.role,
  )
    .map((item) => ({ item, count: badges[item.url] ?? 0 }))
    .filter(({ count }) => count > 0);

  const totalNotifications = notifications.reduce(
    (sum, { count }) => sum + count,
    0,
  );

  const handleSignOut = () => {
    void signOut({ redirectTo: "/login" });
  };

  return (
    <header
      className={cn(
        "bg-card flex h-14 w-full items-center justify-between gap-3 border-b px-3 sm:h-22 sm:px-4",
        isEmployee && "hidden lg:flex",
      )}
    >
      {/* Left: mobile sidebar toggle (desktop toggle lives in the sidebar header) & page title */}
      <div className="flex min-w-0 items-center">
        <SidebarTrigger className="text-muted-foreground me-3 shrink-0 md:hidden" />

        <h1 className="text-foreground truncate text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h1>
      </div>

      {/* Right: search, notification & profile */}
      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <SidebarSearch groups={searchGroups} trigger="icon" />
        <ToggleTheme />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted bg-muted/60 relative flex size-9 items-center justify-center rounded-full sm:size-10"
              aria-label={
                totalNotifications > 0
                  ? `Notifikasi (${totalNotifications} perlu ditindak)`
                  : "Notifikasi"
              }
            >
              <Bell className="h-4 w-4" />

              {totalNotifications > 0 && (
                <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
                  {totalNotifications > 99 ? "99+" : totalNotifications}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifikasi</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {notifications.length === 0 ? (
              <p className="text-muted-foreground px-3 py-2 text-sm">
                Tidak ada yang perlu ditindak.
              </p>
            ) : (
              notifications.map(({ item, count }) => (
                <DropdownMenuItem key={item.url} asChild>
                  <Link href={item.url} className="flex items-center gap-2.5">
                    <item.icon className="text-muted-foreground size-4" />
                    <span className="flex-1 truncate">{item.title}</span>
                    <span className="bg-destructive text-destructive-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                      {count > 99 ? "99+" : count}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted flex items-center gap-2 rounded-lg px-1.5 py-1.5 sm:gap-3 sm:px-2"
            >
              {/* Avatar */}
              <div className="bg-muted/60 flex size-9 items-center justify-center overflow-hidden rounded-full sm:size-10">
                <User className="text-primary-subtle h-5 w-5" />
              </div>

              {/* User Info */}
              <div className="hidden text-left sm:block">
                <p className="text-sm leading-none font-medium">
                  {user.name}
                </p>

                <p className="text-muted-foreground mt-1 text-xs capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>

              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profil" className="flex items-center gap-2.5">
                <User className="size-4" />
                Profil
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onSelect={handleSignOut}>
              <LogOut className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
