"use client";

import { cn } from "@/lib/utils";
import type { PresentationTheme } from "@/lib/types/database";

interface ThemePickerProps {
  value: PresentationTheme;
  onChange: (theme: PresentationTheme) => void;
}

const themes: {
  value: PresentationTheme;
  label: string;
  bg: string;
  ring: string;
}[] = [
  { value: "dark", label: "Sombre", bg: "bg-[#09090b]", ring: "ring-white/20" },
  { value: "light", label: "Clair", bg: "bg-white", ring: "ring-gray-300" },
  {
    value: "brand",
    label: "Brand",
    bg: "bg-gradient-to-br from-[#09090b] to-[#1a0f14]",
    ring: "ring-emerald-500/30",
  },
];

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="flex gap-2">
      {themes.map((theme) => (
        <button
          key={theme.value}
          onClick={() => onChange(theme.value)}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg p-2 transition-all",
            value === theme.value
              ? "ring-2 ring-emerald-500"
              : "ring-1 ring-border/50 hover:ring-border",
          )}
        >
          <div
            className={cn(
              "h-8 w-12 rounded-md",
              theme.bg,
              "ring-1",
              theme.ring,
            )}
          />
          <span className="text-[10px] text-muted-foreground">
            {theme.label}
          </span>
        </button>
      ))}
    </div>
  );
}
