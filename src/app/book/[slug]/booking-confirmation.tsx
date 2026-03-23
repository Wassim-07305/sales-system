"use client";

import { useCallback } from "react";
import { Clock, Users, Calendar, Download, Video } from "lucide-react";
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
  meetingLink?: string;
}

export function BookingConfirmation({
  prospectName,
  prospectEmail,
  date,
  startTime,
  endTime,
  clientName,
  meetingLink,
}: BookingConfirmationProps) {
  const formattedDate = format(
    new Date(date + "T00:00:00"),
    "EEEE, d MMMM yyyy",
    { locale: fr },
  );
  const displayName = clientName || prospectName;
  const initial = displayName.charAt(0).toUpperCase();

  // Build date strings for calendar links (format: YYYYMMDDTHHmmss)
  const startDateTime = `${date.replace(/-/g, "")}T${startTime.replace(/:/g, "")}00`;
  const endDateTime = `${date.replace(/-/g, "")}T${endTime.replace(/:/g, "")}00`;

  const eventTitle = `Réunion avec ${displayName}`;
  const eventDetails = meetingLink
    ? `Lien de réunion : ${meetingLink}`
    : `Réunion confirmée avec ${displayName}`;

  const googleCalendarUrl = `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(eventDetails)}`;

  const handleDownloadIcs = useCallback(() => {
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SalesSystem//Booking//FR",
      "BEGIN:VEVENT",
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${eventTitle}`,
      `DESCRIPTION:${eventDetails}`,
      meetingLink ? `URL:${meetingLink}` : "",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reunion.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [startDateTime, endDateTime, eventTitle, eventDetails, meetingLink]);

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

        <div className="mx-6 border-t border-gray-100" />

        {/* Meeting link */}
        {meetingLink && (
          <>
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-start gap-3">
                <Video className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Lien de réunion
                  </p>
                </div>
              </div>
              <a
                href={meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Video className="h-3.5 w-3.5" />
                Rejoindre l&apos;appel
              </a>
            </div>
            <div className="mx-6 border-t border-gray-100" />
          </>
        )}

        {/* Calendar actions */}
        <div className="flex items-center gap-3 px-6 py-5">
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Calendar className="h-4 w-4" />
            Ajouter à Google Calendar
          </a>
          <button
            onClick={handleDownloadIcs}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Télécharger .ics
          </button>
        </div>
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Powered by{" "}
        <span className="font-semibold text-gray-500">SalesSystem</span>
      </p>
    </div>
  );
}
