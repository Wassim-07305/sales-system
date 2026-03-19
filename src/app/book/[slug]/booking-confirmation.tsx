"use client";

import { Clock, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingConfirmationProps {
  prospectName: string;
  prospectEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  brandColor: string;
  clientName?: string;
}

export function BookingConfirmation({
  prospectName,
  prospectEmail,
  date,
  startTime,
  endTime,
  clientName,
}: BookingConfirmationProps) {
  const formattedDate = format(
    new Date(date + "T00:00:00"),
    "EEEE, d MMMM yyyy",
    { locale: fr },
  );
  const displayName = clientName || prospectName;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="mb-8 text-2xl font-bold text-gray-900">
        Merci ! Votre réunion est confirmée.
      </h1>

      <div className="rounded-xl border border-gray-200 bg-white text-left shadow-sm">
        {/* Prévue avec */}
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-gray-500">
              Votre réunion est prévue avec :
            </p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {displayName}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
            {initial}
          </div>
        </div>

        <div className="mx-6 border-t border-gray-100" />

        {/* Temps */}
        <div className="flex items-start gap-3 px-6 py-5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-500">Temps</p>
            <p className="mt-0.5 font-semibold capitalize text-gray-900">
              {formattedDate}
            </p>
            <p className="text-sm text-gray-600">
              {startTime} - {endTime} (France Time)
            </p>
          </div>
        </div>

        <div className="mx-6 border-t border-gray-100" />

        {/* Invité */}
        <div className="flex items-start gap-3 px-6 py-5">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-500">Invité</p>
            <p className="mt-0.5 font-semibold text-gray-900">
              {prospectEmail || prospectName}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Powered by{" "}
        <span className="font-semibold text-gray-500">SalesSystem</span>
      </p>
    </div>
  );
}
