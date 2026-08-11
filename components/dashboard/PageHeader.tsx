import { ReactNode } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 space-y-3">
          <h1 className="text-foreground truncate text-4xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
