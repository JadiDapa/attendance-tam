"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { User } from "@/generated/prisma";
import {
  filterMenuByRole,
  overviewItems,
  settingsItems,
  type MenuItem,
} from "@/lib/sidebar-menu";
import { LogOut, ChevronsUpDown, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Image from "next/image";

/** Angka merah jumlah item yang perlu ditindak pada satu menu. */
function NavBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={`${count} perlu ditindak`}
      className="bg-destructive text-destructive-foreground ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums group-data-[collapsible=icon]:hidden"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  badges,
}: {
  label: string;
  items: MenuItem[];
  pathname: string;
  badges: Record<string, number>;
}) {
  if (items.length === 0) return null;

  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel className="text-muted-foreground mb-1 px-6 text-xs font-medium tracking-wide uppercase">
        {label}
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const active =
              pathname === item.url || pathname.startsWith(`${item.url}/`);

            const badge = badges[item.url] ?? 0;

            return (
              <SidebarMenuItem key={item.url} className="relative">
                {/* Active indicator */}
                {active && (
                  <span className="bg-primary absolute top-1/2 left-0 z-10 h-9 w-1.5 -translate-y-1/2 rounded-r-full" />
                )}

                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={badge > 0 ? `${item.title} (${badge})` : item.title}
                  className={cn(
                    `h-11 rounded-xl px-6 text-sm font-medium transition-all duration-200`,
                    active
                      ? `text-foreground! bg-transparent! hover:bg-transparent!`
                      : `text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-transparent!`,
                  )}
                >
                  <Link
                    href={item.url}
                    className="flex w-full items-center gap-3"
                  >
                    <item.icon
                      className={cn(
                        "size-7 shrink-0 transition-colors",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />

                    <span
                      className={cn(
                        "truncate text-base",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {item.title}
                    </span>

                    {badge > 0 && <NavBadge count={badge} />}
                  </Link>
                </SidebarMenuButton>

                {/* Collapsed sidebar badge */}
                {badge > 0 && (
                  <span className="bg-destructive absolute top-1 right-1 hidden size-2 rounded-full group-data-[collapsible=icon]:block" />
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export default function DashboardSidebar({
  user,
  badges,
}: {
  user: User;
  /** Jumlah item yang perlu ditindak, dipetakan per URL menu. */
  badges: Record<string, number>;
}) {
  const pathname = usePathname();

  const mainItems = filterMenuByRole(overviewItems, user.role);
  const otherItems = filterMenuByRole(settingsItems, user.role);

  const displayName = user.name || user.email || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
      className="bg-card border-0 p-3"
    >
      <SidebarHeader className="bg-background overflow-hidden rounded-t-md p-3">
        <div className="flex items-center gap-5 rounded-xl px-2 py-2.5">
          <Image src="/icon.webp" alt="Logo" width={50} height={30} />

          <div className="min-w-0 flex-1">
            <p className="letter truncate text-xl font-semibold tracking-wide">
              ABSENSI
            </p>

            <p className="text-muted-foreground truncate text-xs">
              Taruna Anugerah Mandiri
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-background gap-7 py-3 group-data-[collapsible=icon]:px-1.5">
        <NavGroup
          label="Menu"
          items={mainItems}
          pathname={pathname}
          badges={badges}
        />
        <NavGroup
          label="Lainnya"
          items={otherItems}
          pathname={pathname}
          badges={badges}
        />
      </SidebarContent>

      <SidebarFooter className="bg-background overflow-hidden rounded-b-md border-t p-3 group-data-[collapsible=icon]:px-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="border-2 border-dashed">
            <button
              type="button"
              className="hover:bg-sidebar-accent flex w-full items-center gap-3 rounded-xl border-0 bg-transparent p-2 text-left transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1"
            >
              <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
                {initial}
              </div>
              <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <span className="text-foreground truncate text-sm font-semibold">
                  {displayName}
                </span>
                <span className="text-muted-foreground truncate text-xs capitalize">
                  {user.role.toLowerCase()}
                </span>
              </div>
              <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="flex flex-col leading-tight">
              <span className="truncate text-sm font-semibold">
                {displayName}
              </span>
              <span className="text-muted-foreground truncate text-xs font-normal">
                {user.email}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profil">
                <UserRound className="size-4" />
                Profil Saya
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
              <LogOut className="size-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
