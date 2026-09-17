"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Icon } from "@/components/mobile/icon";
import { cn } from "@/lib/utils";
import type { ApiEmployee } from "@/lib/mobile-queries";

/** Mirrors mobile's `EmployeeMultiSelect` — search + checklist bottom sheet. */
export function EmployeeMultiSelect({
  open,
  employees,
  selectedIds,
  onClose,
  onApply,
}: {
  open: boolean;
  employees: ApiEmployee[];
  selectedIds: string[];
  onClose: () => void;
  onApply: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>(selectedIds);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => e.name.toLowerCase().includes(q));
  }, [employees, query]);

  function toggle(id: string) {
    setDraft((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function handleClose() {
    setDraft(selectedIds);
    setQuery("");
    onClose();
  }

  function handleApply() {
    onApply(draft);
    setQuery("");
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && handleClose()}>
      <DrawerContent className="max-h-[80vh] md:hidden">
        <div className="flex flex-col gap-3 p-2">
          <h2 className="text-foreground text-center text-base font-bold">
            Pilih Karyawan
          </h2>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama karyawan..."
            className="bg-muted text-foreground rounded-xl px-4 py-3"
          />

          {draft.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {draft.length} karyawan dipilih
            </span>
          )}

          <div className="max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Karyawan tidak ditemukan.
              </p>
            ) : (
              filtered.map((employee) => {
                const isSelected = draft.includes(employee.id);
                return (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => toggle(employee.id)}
                    className="border-border flex w-full items-center gap-3 border-b py-3 text-left"
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded-md",
                        isSelected ? "bg-primary" : "border-border border",
                      )}
                    >
                      {isSelected && (
                        <Icon icon={Check} size={14} tone="inverse" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground block text-sm">
                        {employee.name}
                      </span>
                      {employee.position && (
                        <span className="text-muted-foreground block text-xs">
                          {employee.position}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="bg-muted text-foreground flex-1 rounded-xl py-3 text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="bg-primary text-primary-foreground flex-1 rounded-xl py-3 text-center font-medium"
            >
              Pilih ({draft.length})
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
