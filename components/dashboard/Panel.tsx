import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Kartu bersama untuk panel dashboard: header ikon + judul + aksi, lalu isi. */
export default function Panel({
  title,
  action,
  children,
  className,
  contentClassName,
}: Props) {
  return (
    <section className={cn("bg-card flex flex-col rounded-2xl", className)}>
      <header className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="truncate text-base font-medium sm:text-lg">
            {title}
          </h2>
        </div>

        {action}
      </header>

      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  );
}
