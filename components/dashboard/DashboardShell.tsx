import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import { User } from "@/generated/prisma";
import { NotificationService } from "@/servers/services/notification.service";
import Navbar from "./Navbar";

type Props = {
  user: User;
  children: ReactNode;
};

export default async function DashboardShell({ user, children }: Props) {
  const badges = await NotificationService.forUser(user);

  return (
    <SidebarProvider className="">
      <DashboardSidebar user={user} badges={badges} />

      <SidebarInset className="bg-card flex-1 space-y-3 overflow-auto p-3 ps-0">
        <Navbar user={user} />
        <main className="bg-background rounded-md p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
