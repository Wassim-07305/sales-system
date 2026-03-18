"use client";

import { Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlotPickerProps {
  times: string[];
  selectedTime: string;
  onSelect: (time: string) => void;
  loading?: boolean;
  brandColor?: string;
}

export function TimeSlotPicker({
  times,
  selectedTime,
  onSelect,
  loading,
  brandColor,
}: TimeSlotPickerProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Chargement des créneaux...
        </span>
      </div>
    );
  }

  if (times.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Aucun créneau disponible pour cette date
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        Choisissez un horaire
      </p>
      <div className="grid grid-cols-3 gap-2">
        {times.map((time) => {
          const isSelected = selectedTime === time;
          return (
            <button
              key={time}
              type="button"
              onClick={() => onSelect(time)}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                isSelected
                  ? "border-transparent shadow-sm ring-2 ring-brand/20"
                  : "border-border/50 hover:border-border hover:shadow-sm",
              )}
              style={
                isSelected && brandColor
                  ? {
                      backgroundColor: brandColor + "15",
                      color: brandColor,
                      borderColor: brandColor + "40",
                    }
                  : isSelected
                    ? {
                        backgroundColor: "hsl(var(--brand) / 0.1)",
                        color: "hsl(var(--brand))",
                      }
                    : undefined
              }
            >
              {time}
            </button>
          );
        })}
      </div>
    </div>
  );
}
