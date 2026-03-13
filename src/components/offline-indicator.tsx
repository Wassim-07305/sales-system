"use client";

import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-500 ease-in-out",
        isOnline ? "max-h-0 opacity-0" : "max-h-12 opacity-100",
      )}
    >
      <div className="flex items-center justify-center gap-2 bg-amber-500/15 border-b border-amber-500/20 px-4 py-2 text-sm text-amber-400">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          Vous êtes hors-ligne. Les modifications seront synchronisées
          automatiquement.
        </span>
      </div>
    </div>
  );
}
