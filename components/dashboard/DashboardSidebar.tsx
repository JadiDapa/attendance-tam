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
import { useTheme } from "next-themes";
import Link from "next/link";
import { User } from "@/generated/prisma";
import {
  filterMenuByRole,
  overviewItems,
  settingsItems,
  type MenuItem,
} from "@/lib/sidebar-menu";
import {
  LogOut,
  ChevronsUpDown,
  ChevronUp,
  Fingerprint,
  Monitor,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SidebarSearch from "./SidebarSearch";
import { cn } from "@/lib/utils";

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
    <Collapsible defaultOpen className="group/nav-group">
      <SidebarGroup className="p-0">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold tracking-widest uppercase transition-colors">
            {label}
            <ChevronUp className="size-3.5 transition-transform group-data-[state=closed]/nav-group:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>

        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active =
                  pathname === item.url || pathname.startsWith(`${item.url}/`);
                const badge = badges[item.url] ?? 0;

                return (
                  <SidebarMenuItem key={item.url} className="relative">
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={
                        badge > 0 ? `${item.title} (${badge})` : item.title
                      }
                      className={cn(
                        "h-10 rounded-xl px-3 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary! text-primary-foreground! hover:bg-primary!"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground bg-transparent!",
                      )}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="size-4 shrink-0" />
                        <span>{item.title}</span>
                        {badge > 0 && <NavBadge count={badge} />}
                      </Link>
                    </SidebarMenuButton>

                    {/* Titik merah saat sidebar menciut jadi ikon — angkanya tidak muat. */}
                    {badge > 0 && (
                      <span className="bg-destructive absolute top-1 right-1 hidden size-2 rounded-full group-data-[collapsible=icon]:block" />
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
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
  const { setTheme } = useTheme();

  const mainItems = filterMenuByRole(overviewItems, user.role);
  const otherItems = filterMenuByRole(settingsItems, user.role);

  const displayName = user.name || user.email || "User";
  const initial = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut({ redirectTo: "/login" });
  };

  return (
    <Sidebar collapsible="icon" className="">
      <SidebarHeader className="bg-card gap-3 p-3 group-data-[collapsible=icon]:px-1.5">
        {/* Workspace card */}
        <div className="border-sidebar-border bg-card flex items-center gap-2.5 rounded-xl border p-2 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Fingerprint className="size-5" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-foreground truncate text-sm font-semibold">
              Absensi
            </span>
            <span className="text-muted-foreground truncate text-xs">
              PT Tri Anugrah Makmur
            </span>
          </div>
          <ChevronsUpDown className="text-muted-foreground size-4 shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>

        <SidebarSearch
          groups={[
            { label: "Menu", items: mainItems },
            { label: "Lainnya", items: otherItems },
          ]}
        />
      </SidebarHeader>

      <SidebarContent className="bg-card gap-5 px-3 py-2 group-data-[collapsible=icon]:px-1.5">
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

      <SidebarFooter className="bg-card p-3 group-data-[collapsible=icon]:px-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="border-sidebar-border bg-card hover:border-ring/40 flex items-center gap-2.5 rounded-xl border p-2 text-left transition-colors group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
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
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" />
              Terang
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" />
              Gelap
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4" />
              Sistem
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
