"use client";

import { formatDateSeparator } from "@/lib/messaging-utils";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">
        {formatDateSeparator(date)}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
