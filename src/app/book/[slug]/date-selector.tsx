"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  format,
  addDays,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DateSelectorProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  maxDate?: string;
}

export function DateSelector({
  selectedDate,
  onSelect,
  maxDate,
}: DateSelectorProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    const start = addDays(today, weekOffset * 7);
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      // Skip weekends (Sat=6, Sun=0)
      if (day.getDay() === 0 || day.getDay() === 6) continue;
      // Skip past dates
      if (isBefore(day, today)) continue;
      // Skip dates beyond max
      if (maxDate && day > new Date(maxDate)) continue;
      result.push(day);
    }
    return result;
  }, [weekOffset, maxDate]);

  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Choisissez un jour
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setWeekOffset(weekOffset + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isSelected = selectedDateObj && isSameDay(day, selectedDateObj);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelect(dateStr)}
              className={cn(
                "flex flex-col items-center rounded-xl border px-2 py-3 text-center transition-all",
                isSelected
                  ? "border-brand bg-brand/10 text-brand shadow-sm"
                  : "border-border/50 hover:border-border hover:shadow-sm",
                isToday(day) && !isSelected && "border-brand/30",
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {format(day, "EEE", { locale: fr })}
              </span>
              <span className="mt-0.5 text-lg font-bold">
                {format(day, "d")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {format(day, "MMM", { locale: fr })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
