"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isBefore,
  isAfter,
  addDays,
  isSameDay,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

interface DateSelectorProps {
  selectedDate: string | null;
  onSelect: (date: string) => void;
  maxDaysAhead: number;
  brandColor: string;
  disabled?: boolean;
  disabledMessage?: string;
}

const DAY_HEADERS = ["DIM.", "LUN.", "MAR.", "MER.", "JEU.", "VEN.", "SAM."];

export function DateSelector({
  selectedDate,
  onSelect,
  maxDaysAhead,
  brandColor,
  disabled,
  disabledMessage,
}: DateSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = startOfDay(new Date());
  const maxDate = addDays(today, maxDaysAhead);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOffset = useMemo(() => {
    return getDay(startOfMonth(currentMonth));
  }, [currentMonth]);

  const isDateSelectable = (date: Date) => {
    if (disabled) return false;
    return !isBefore(date, today) && !isAfter(date, maxDate);
  };

  const canGoPrev = !isBefore(startOfMonth(currentMonth), today);

  return (
    <div>
      {/* Month + Year header */}
      <div className="mb-5 flex items-center justify-between">
        <span className="text-sm font-medium capitalize text-gray-900">
          {format(currentMonth, "MMMM yyyy", { locale: fr })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            disabled={!canGoPrev || disabled}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            disabled={disabled}
            className="rounded p-1 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="relative">
        {/* Day headers */}
        <div className="mb-3 grid grid-cols-7 text-center">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="py-1 text-[11px] font-medium tracking-wide text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day numbers */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const selectable = isDateSelectable(day);
            const isSelected =
              selectedDate &&
              isSameDay(day, new Date(selectedDate + "T00:00:00"));
            const isToday = isSameDay(day, today);

            return (
              <div
                key={dateStr}
                className="flex items-center justify-center py-0.5"
              >
                <button
                  type="button"
                  disabled={!selectable}
                  onClick={() => onSelect(dateStr)}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full text-sm transition-all ${
                    isSelected
                      ? "font-bold text-white"
                      : selectable
                        ? "font-medium text-blue-900 bg-blue-50 hover:bg-blue-100"
                        : "cursor-default font-normal text-gray-300"
                  }`}
                  style={
                    isSelected ? { backgroundColor: brandColor } : undefined
                  }
                >
                  {format(day, "d")}
                  {isToday && !isSelected && (
                    <div className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-current" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Disabled overlay */}
        {disabled && disabledMessage && (
          <div className="absolute inset-0 top-10 flex items-center justify-center">
            <div className="rounded-lg border border-gray-200 bg-white px-5 py-3.5 text-center text-sm leading-relaxed text-gray-600 shadow-sm">
              {disabledMessage}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
