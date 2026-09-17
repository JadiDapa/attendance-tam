import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Icon } from "@/components/mobile/icon";

/** Mirrors mobile's `SectionHeader` — title + count + optional "Lebih Banyak" link. */
export function SectionHeader({
  title,
  count,
  seeAllHref,
}: {
  title: string;
  count: number;
  seeAllHref?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-foreground line-clamp-1 min-w-0 flex-1 text-lg font-bold">
        {title}{" "}
        <span className="text-muted-foreground text-sm font-normal">
          ({count})
        </span>
      </h2>
      {seeAllHref && (
        <Link href={seeAllHref} className="flex items-center gap-0.5">
          <span className="text-primary text-sm font-semibold">
            Lebih Banyak
          </span>
          <Icon icon={ChevronRight} size={14} tone="primary" />
        </Link>
      )}
    </div>
  );
}
