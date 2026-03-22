"use client";

import { cn } from "@/lib/utils";
import type {
  PresentationSlide,
  PresentationTheme,
} from "@/lib/types/database";

interface SlideThumbnailProps {
  slide: PresentationSlide;
  theme: PresentationTheme;
  index: number;
  isActive: boolean;
  onClick: () => void;
}

const themeBg: Record<string, string> = {
  dark: "bg-[#09090b]",
  light: "bg-white",
  brand: "bg-gradient-to-br from-[#09090b] to-[#1a0f14]",
};

const themeText: Record<string, string> = {
  dark: "text-white",
  light: "text-gray-900",
  brand: "text-white",
};

export function SlideThumbnail({
  slide,
  theme,
  index,
  isActive,
  onClick,
}: SlideThumbnailProps) {
  const title = slide.content?.title || slide.content?.quote || "";
  const subtitle = slide.content?.subtitle || slide.content?.body || "";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg border transition-all overflow-hidden group",
        isActive
          ? "border-emerald-500 ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
          : "border-border/40 hover:border-border/80",
      )}
    >
      <div className="flex items-center gap-2 p-1.5">
        <span className="text-[9px] font-medium text-muted-foreground w-4 text-center shrink-0">
          {index + 1}
        </span>
        <div
          className={cn(
            "flex-1 aspect-video rounded overflow-hidden p-2 flex flex-col justify-center",
            themeBg[theme] || themeBg.dark,
          )}
        >
          {title && (
            <p
              className={cn(
                "text-[7px] font-bold leading-tight line-clamp-2",
                themeText[theme] || themeText.dark,
              )}
            >
              {title}
            </p>
          )}
          {subtitle && (
            <p
              className={cn(
                "text-[5px] leading-tight line-clamp-2 mt-0.5 opacity-60",
                themeText[theme] || themeText.dark,
              )}
            >
              {subtitle}
            </p>
          )}
          {!title && !subtitle && (
            <p className="text-[6px] text-muted-foreground/50 italic text-center">
              {slide.layout}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
