"use client";

import {
  MoonIcon as Moon,
  SunIcon as Sun,
  DesktopIcon as Monitor,
} from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/hooks/use-mounted";

const CYCLE = [
  { value: "light", label: "Terang", icon: Sun },
  { value: "dark", label: "Gelap", icon: Moon },
  { value: "system", label: "Ikuti Sistem", icon: Monitor },
] as const;

export function ToggleTheme() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <Button
        variant="outline"
        className="bg-muted/60 hover:bg-muted rounded-full border-none"
        size="icon"
        aria-label="Ganti tema"
      >
        <Monitor className="size-5" />
        <span className="sr-only">Ganti tema</span>
      </Button>
    );
  }

  const index = Math.max(0, CYCLE.findIndex((mode) => mode.value === theme));
  const current = CYCLE[index] ?? CYCLE[2];
  const next = CYCLE[(index + 1) % CYCLE.length] ?? CYCLE[0];

  return (
    <Button
      variant="outline"
      className="bg-muted/60 hover:bg-muted rounded-full border-none"
      size="icon"
      onClick={() => setTheme(next.value)}
      aria-label={`Ganti tema ke ${next.label}`}
    >
      <current.icon className="size-5" />
      <span className="sr-only">
        Tema saat ini: {current.label}. Klik untuk ganti ke {next.label}.
      </span>
    </Button>
  );
}
