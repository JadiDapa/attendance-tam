"use client";

import { ChevronLeftIcon as ChevronLeft } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Kembali"
      className={cn(
        "text-muted-foreground hover:bg-muted flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
        className,
      )}
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}
