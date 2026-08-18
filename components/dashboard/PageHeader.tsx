import { ReactNode } from "react";
import BackButton from "./BackButton";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Tampilkan bar judul mobile ala navbar (tombol kembali + judul di tengah)
   * yang menggantikan Navbar — cuma muncul di bawah lg. */
  back?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  back = false,
}: PageHeaderProps) {
  return (
    <>
      {back && (
        <div className="bg-card -mx-4 -mt-4 mb-3 flex items-center gap-2 border-b px-3 py-3 shadow-sm lg:hidden">
          <BackButton className="text-primary bg-primary/10 hover:bg-primary/15" />

          <h1 className="text-foreground min-w-0 flex-1 truncate text-center text-base font-semibold">
            {title}
          </h1>

          {/* Spacer supaya judul tetap di tengah, seimbang dengan tombol kembali. */}
          <div className="size-9 shrink-0" aria-hidden />
        </div>
      )}

      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-3 sm:gap-4",
          back && "hidden lg:flex",
        )}
      >
        <div className="flex min-w-0 items-start gap-2">
          <div className="min-w-0 space-y-1.5 sm:space-y-3">
            <h1 className="text-foreground truncate text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
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
    </>
  );
}
