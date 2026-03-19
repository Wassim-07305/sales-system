"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { AvailableSlot } from "@/lib/types/database";

interface TimeSlotPickerProps {
  slots: AvailableSlot[];
  selectedSlot: { start_time: string; closer_id: string } | null;
  onSelect: (slot: { start_time: string; closer_id: string }) => void;
  isLoading: boolean;
  submitting?: boolean;
  brandColor: string;
  selectedDate: string;
}

export function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelect,
  isLoading,
  submitting,
  brandColor,
  selectedDate,
}: TimeSlotPickerProps) {
  const [pendingSlot, setPendingSlot] = useState<{
    start_time: string;
    closer_id: string;
  } | null>(null);

  // Reset pending when date changes
  useEffect(() => {
    setPendingSlot(null);
  }, [selectedDate]);

  // Deduplicate by start_time (pick first available closer)
  const uniqueSlots = slots.reduce<AvailableSlot[]>((acc, slot) => {
    if (!acc.find((s) => s.start_time === slot.start_time)) {
      acc.push(slot);
    }
    return acc;
  }, []);

  // Date header: "Lun 16"
  const dateObj = new Date(selectedDate + "T00:00:00");
  const dateHeader = format(dateObj, "EEE d", { locale: fr });

  const handleSlotClick = (slot: { start_time: string; closer_id: string }) => {
    if (submitting) return;
    if (
      pendingSlot?.start_time === slot.start_time &&
      pendingSlot?.closer_id === slot.closer_id
    ) {
      setPendingSlot(null);
    } else {
      setPendingSlot(slot);
    }
  };

  const handleConfirm = () => {
    if (!pendingSlot || submitting) return;
    onSelect(pendingSlot);
  };

  if (isLoading) {
    return (
      <div>
        <p className="mb-4 text-sm font-semibold capitalize text-gray-900">
          {dateHeader}
        </p>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (uniqueSlots.length === 0) {
    return (
      <div>
        <p className="mb-4 text-sm font-semibold capitalize text-gray-900">
          {dateHeader}
        </p>
        <p className="py-12 text-center text-sm text-gray-400">
          Aucun créneau disponible
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm font-semibold capitalize text-gray-900">
        {dateHeader}
      </p>

      <div className="max-h-[360px] space-y-2 overflow-y-auto">
        {uniqueSlots.map((slot) => {
          const displayTime = slot.start_time.slice(0, 5);
          const isPending =
            pendingSlot?.start_time === slot.start_time &&
            pendingSlot?.closer_id === slot.closer_id;
          const isConfirmed =
            selectedSlot?.start_time === slot.start_time &&
            selectedSlot?.closer_id === slot.closer_id;
          const isActive = isPending || isConfirmed;
          const isSubmittingThis = isConfirmed && submitting;

          return (
            <button
              key={`${slot.start_time}-${slot.closer_id}`}
              type="button"
              disabled={submitting}
              onClick={() =>
                handleSlotClick({
                  start_time: slot.start_time,
                  closer_id: slot.closer_id,
                })
              }
              className={`flex w-full items-center justify-center rounded-lg border py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "border-transparent text-white shadow-sm"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              } ${submitting && !isActive ? "cursor-not-allowed opacity-40" : ""}`}
              style={isActive ? { backgroundColor: brandColor } : undefined}
            >
              {isSubmittingThis ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                displayTime
              )}
            </button>
          );
        })}
      </div>

      {/* Confirm button */}
      {pendingSlot && !submitting && (
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: brandColor }}
        >
          Confirmer — {pendingSlot.start_time.slice(0, 5)}
        </button>
      )}
      {submitting && (
        <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Réservation en cours...
        </div>
      )}
    </div>
  );
}
