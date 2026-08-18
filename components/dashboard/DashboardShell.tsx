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
      {/* Karyawan pakai bottom nav di mobile/tablet, sidebar cuma tampil dari lg ke atas */}
      <div className={cn(isEmployee && "hidden lg:block")}>
        <DashboardSidebar user={user} badges={badges} />
      </div>

      <SidebarInset
        className={cn(
          "bg-card flex-1 space-y-3 overflow-auto",
          isEmployee ? "p-0 lg:p-3 lg:ps-0" : "p-3 ps-0",
        )}
      >
        <Navbar user={user} />
        <main
          className={cn(
            "bg-background rounded-md p-3 sm:p-4",
            isEmployee &&
              "flex flex-1 flex-col rounded-none p-4 pb-28 lg:rounded-md lg:pb-4",
          )}
        >
          {children}
        </main>
      </SidebarInset>

      {isEmployee && <BottomNav />}
    </SidebarProvider>
  );
}
