import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import { Role, User } from "@/generated/prisma";
import { NotificationService } from "@/servers/services/notification.service";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { cn } from "@/lib/utils";

type Props = {
  user: User;
  children: ReactNode;
};

export default async function DashboardShell({ user, children }: Props) {
  const badges = await NotificationService.forUser(user);
  const isEmployee = user.role === Role.EMPLOYEE;

  return (
    <SidebarProvider className="">
      {/* Every role's mobile-parity tree (`md:hidden` inside `children`) owns the
          screen below `md`; the desktop sidebar only ever shows from `md` up.
          Employee additionally keeps its own tablet-tier `BottomNav` instead of
          the sidebar between `md` and `lg` — unchanged from before. */}
      <div className={cn("hidden", isEmployee ? "lg:block" : "md:block")}>
        <DashboardSidebar user={user} badges={badges} />
      </div>

      <SidebarInset className="bg-background flex-1 overflow-auto">
        <Navbar user={user} badges={badges} />
        <main className="flex flex-1 flex-col p-4 pb-28 lg:pb-4">
          {children}
        </main>
      </SidebarInset>

      {isEmployee && <BottomNav />}
    </SidebarProvider>
  );
}
