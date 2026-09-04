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
  SidebarSeparator,
  SidebarTrigger,
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
import { ExitIcon as LogOut } from "@radix-ui/react-icons";
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
    <SidebarGroup className="p-0 px-6">
      <SidebarGroupLabel className="text-muted-foreground/70 mb-2 px-6 text-[11px] font-semibold tracking-widest uppercase">
        {label}
      </SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {items.map((item) => {
            const active =
              pathname === item.url || pathname.startsWith(`${item.url}/`);

            const badge = badges[item.url] ?? 0;

            return (
              <SidebarMenuItem key={item.url} className="relative">
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={badge > 0 ? `${item.title} (${badge})` : item.title}
                  className={cn(
                    `h-11 rounded-xl text-sm font-medium transition-all duration-200`,
                    active
                      ? `bg-primary/10! text-primary-subtle! hover:bg-primary/10!`
                      : `text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-transparent!`,
                  )}
                >
                  <Link
                    href={item.url}
                    className="flex w-full items-center gap-3"
                  >
                    <item.icon
                      className={cn(
                        "size-5 shrink-0 transition-colors",
                        active ? "text-icon-active" : "text-muted-foreground",
                      )}
                    />

                    <span
                      className={cn(
                        "truncate text-sm",
                        active ? "text-primary-subtle font-semibold" : "font-medium",
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

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" className="bg-card border-r">
      <SidebarHeader className="border-b p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2.5">
          <Image src="/icon.webp" alt="Logo" width={40} height={24} />

          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="letter truncate text-xl font-semibold tracking-wide">
              ABSENSI
            </p>

            <p className="text-muted-foreground truncate text-xs">
              Taruna Anugerah Mandiri
            </p>
          </div>

          <SidebarTrigger className="text-muted-foreground ml-auto shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4 py-4 group-data-[collapsible=icon]:px-1.5">
        <NavGroup
          label="Menu"
          items={mainItems}
          pathname={pathname}
          badges={badges}
        />

        {otherItems.length > 0 && <SidebarSeparator className="mx-6 w-full" />}

        <NavGroup
          label="Lainnya"
          items={otherItems}
          pathname={pathname}
          badges={badges}
        />
      </SidebarContent>

      <SidebarFooter className="border-t p-3 group-data-[collapsible=icon]:px-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              tooltip="Keluar"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive h-11 rounded-xl px-6 text-sm font-medium"
            >
              <LogOut className="size-5 shrink-0" />
              <span className="truncate text-sm font-medium">Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
