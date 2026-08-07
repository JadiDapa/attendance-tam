import { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import { User } from "@/generated/prisma";
import { NotificationService } from "@/servers/services/notification.service";

type Props = {
  user: User;
  children: ReactNode;
};

export default async function DashboardShell({ user, children }: Props) {
  const badges = await NotificationService.forUser(user);

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} badges={badges} />

      <SidebarInset className="bg-card border-border overflow-hidden md:peer-data-[variant=inset]:m-2.5 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:peer-data-[variant=inset]:shadow-sm">
        <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
