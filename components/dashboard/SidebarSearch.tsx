"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon as Search } from "@radix-ui/react-icons";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import type { MenuItem } from "@/lib/sidebar-menu";
import { cn } from "@/lib/utils";

type Props = {
  groups: { label: string; items: MenuItem[] }[];
  /** "bar" (default) = input placeholder ala sidebar. "icon" = tombol bulat ala navbar. */
  trigger?: "bar" | "icon";
};

export default function SidebarSearch({ groups, trigger = "bar" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const go = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  return (
    <>
      {trigger === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Cari menu"
          className="hover:bg-muted bg-muted/60 flex size-9 shrink-0 items-center justify-center rounded-full sm:size-10"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "border-sidebar-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-sm transition-colors group-data-[collapsible=icon]:hidden",
          )}
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Cari menu ..</span>
          <Kbd className="text-[10px]">⌘K</Kbd>
        </button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Pencarian"
        description="Cari dan buka halaman"
      >
        <Command>
          <CommandInput placeholder="Cari halaman .." />
          <CommandList>
            <CommandEmpty>Tidak ada hasil.</CommandEmpty>
            {groups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.url}
                      value={item.title}
                      onSelect={() => go(item.url)}
                    >
                      <item.icon className="size-4" />
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
