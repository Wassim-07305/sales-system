"use client";
import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

export function OnlineStatus({ isOnline, className }: OnlineStatusProps) {
  if (!isOnline) return null;

  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-[#7af17a] ring-2 ring-card",
        className
      )}
      title="En ligne"
    />
  );
}
