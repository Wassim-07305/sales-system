"use client";

import { cn } from "@/lib/utils";
import type { SlideLayout } from "@/lib/types/database";
import {
  Type,
  AlignLeft,
  List,
  Columns2,
  ImageIcon,
  Quote,
  BarChart3,
  Minus,
  Square,
} from "lucide-react";

interface LayoutPickerProps {
  value: SlideLayout;
  onChange: (layout: SlideLayout) => void;
}

const layouts: { value: SlideLayout; label: string; icon: typeof Type }[] = [
  { value: "title", label: "Titre", icon: Type },
  { value: "title_content", label: "Titre + contenu", icon: AlignLeft },
  { value: "bullets", label: "Liste à puces", icon: List },
  { value: "two_columns", label: "Deux colonnes", icon: Columns2 },
  { value: "image_left", label: "Image gauche", icon: ImageIcon },
  { value: "image_right", label: "Image droite", icon: ImageIcon },
  { value: "image_full", label: "Image plein", icon: ImageIcon },
  { value: "quote", label: "Citation", icon: Quote },
  { value: "chart", label: "Graphique", icon: BarChart3 },
  { value: "section", label: "Section", icon: Minus },
  { value: "blank", label: "Vide", icon: Square },
];

export function LayoutPicker({ value, onChange }: LayoutPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {layouts.map((layout) => {
        const Icon = layout.icon;
        return (
          <button
            key={layout.value}
            onClick={() => onChange(layout.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] transition-all hover:bg-muted/50",
              value === layout.value
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                : "border-border/50 text-muted-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {layout.label}
          </button>
        );
      })}
    </div>
  );
}
