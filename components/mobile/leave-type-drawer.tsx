"use client";

import {
  Stethoscope,
  FileText,
  Plane,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Icon } from "@/components/mobile/icon";

export type LeaveRequestType = "Sakit" | "Izin" | "Cuti";

const OPTIONS: {
  type: LeaveRequestType;
  icon: LucideIcon;
  description: string;
}[] = [
  { type: "Sakit", icon: Stethoscope, description: "Tidak masuk karena sakit" },
  {
    type: "Izin",
    icon: FileText,
    description: "Izin keperluan pribadi/mendadak",
  },
  { type: "Cuti", icon: Plane, description: "Cuti tahunan terjadwal" },
];

/** Mirrors mobile's `LeaveTypeDrawer` — bottom sheet to pick Sakit/Izin/Cuti before the create form. */
export function LeaveTypeDrawer({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (type: LeaveRequestType) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <DrawerContent className="md:hidden">
        <div className="flex flex-col gap-2 p-2">
          <h2 className="text-foreground pb-2 text-center text-base font-bold">
            Ajukan Pengajuan
          </h2>

          {OPTIONS.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type)}
              className="bg-muted flex items-center gap-3 rounded-xl p-3 text-left"
            >
              <span className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                <Icon icon={option.icon} size={20} />
              </span>
              <span className="flex-1">
                <span className="text-foreground block text-sm font-bold">
                  {option.type}
                </span>
                <span className="text-muted-foreground line-clamp-1 block text-xs">
                  {option.description}
                </span>
              </span>
              <Icon icon={ChevronRight} size={16} tone="primary" />
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
