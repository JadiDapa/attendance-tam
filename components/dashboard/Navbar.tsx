import React from "react";
import {
  Bell,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Sun,
  User,
} from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import { format } from "date-fns/format";
import { Role, User as UserType } from "@/generated/prisma";
import { ToggleTheme } from "./ToggleTheme";
import { cn } from "@/lib/utils";

export default function Navbar({ user }: { user: UserType }) {
  const date = format(new Date(), "EEEE, MMMM d");
  const isEmployee = user.role === Role.EMPLOYEE;

  return (
    <header
      className={cn(
        "bg-background flex h-14 w-full items-center justify-between rounded-md px-3 sm:h-16 sm:px-4",
        isEmployee && "hidden lg:flex",
      )}
    >
      {/* Left: Date & Weather */}
      <SidebarTrigger
        className={cn(
          "text-muted-foreground me-3 mt-0.5 -ml-1.5 shrink-0 sm:me-6",
          isEmployee && "hidden lg:flex",
        )}
      />

      <div className="hidden items-center gap-4 sm:flex">
        <div className="leading-tight">
          <p className="text-muted-foreground text-sm">{date}</p>

          <div className="mt-1 flex items-center gap-2">
            <Sun className="text-primary h-4 w-4" />
            <span className="text-sm font-medium">27°C</span>
          </div>
        </div>
      </div>

      {/* Center: Search */}
      <div className="absolute left-1/2 hidden w-full max-w-md -translate-x-1/2 md:block">
        <div className="bg-card flex h-10 items-center rounded-full px-4">
          <Search className="text-muted-foreground mr-3 h-4 w-4" />

          <input
            type="text"
            placeholder="Search"
            className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          />

          <SlidersHorizontal className="text-muted-foreground h-4 w-4" />
        </div>
      </div>

      {/* Right: Notification & Profile */}
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <ToggleTheme />

        {/* Notification */}
        <button
          type="button"
          className="hover:bg-muted bg-card flex size-9 items-center justify-center rounded-full sm:size-10"
        >
          <Bell className="h-4 w-4" />
        </button>

        {/* Profile */}
        <button
          type="button"
          className="hover:bg-muted flex items-center gap-2 rounded-lg px-1.5 py-1.5 sm:gap-3 sm:px-2"
        >
          {/* Avatar */}
          <div className="bg-card flex size-9 items-center justify-center overflow-hidden rounded-full sm:size-10">
            <User className="text-primary h-5 w-5" />
          </div>

          {/* User Info */}
          <div className="hidden text-left sm:block">
            <p className="text-sm leading-none font-medium">{user.name}</p>

            <p className="text-muted-foreground mt-1 text-xs">{user.email}</p>
          </div>

          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
