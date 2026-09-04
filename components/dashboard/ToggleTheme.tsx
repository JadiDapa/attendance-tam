"use client";

import {
  MoonIcon as Moon,
  SunIcon as Sun,
  DesktopIcon as Monitor,
} from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const CYCLE = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Monitor },
] as const;

export function ToggleTheme() {
  const { theme, setTheme } = useTheme();

  const index = CYCLE.findIndex((mode) => mode.value === theme);
  const current = CYCLE[index] ?? CYCLE[2];
  const next = CYCLE[(index + 1) % CYCLE.length] ?? CYCLE[0];

  return (
    <Button
      variant="outline"
      className="bg-muted/60 hover:bg-muted rounded-full border-none"
      size="icon"
      onClick={() => setTheme(next.value)}
    >
      <current.icon className="size-5" />
      <span className="sr-only">
        Tema saat ini: {current.label}. Klik untuk ganti ke {next.label}.
      </span>
    </Button>
  );
}
