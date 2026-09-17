"use client";

import { CheckCircle2 } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Icon } from "@/components/mobile/icon";

/** Mirrors mobile's `OptionDrawer` — generic bottom-sheet single-select list. */
export function OptionDrawer<T extends string>({
  open,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: {
  open: boolean;
  title: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onClose: () => void;
  onSelect: (value: T) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent className="max-h-[70vh] md:hidden">
        <div className="flex flex-col gap-2 overflow-y-auto p-2">
          <h2 className="text-foreground pb-2 text-center text-base font-bold">
            {title}
          </h2>

          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className="bg-muted flex items-center justify-between rounded-xl p-3 text-left"
            >
              <span className="text-foreground text-sm font-medium">
                {option.label}
              </span>
              {selected === option.value && (
                <Icon icon={CheckCircle2} size={18} tone="primary" />
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground rounded-xl py-3 text-center text-sm"
          >
            Batal
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
