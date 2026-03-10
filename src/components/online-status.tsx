"use client";
import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

export function OnlineStatus({ isOnline, className }: OnlineStatusProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        isOnline ? "bg-green-500" : "bg-gray-500",
        className
      )}
      title={isOnline ? "En ligne" : "Hors ligne"}
    />
  );
}
