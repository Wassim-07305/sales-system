"use client";

import { CheckCircle2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface BookingConfirmationProps {
  email: string;
  date: string;
  time: string;
  pageTitle?: string;
  brandColor?: string;
}

export function BookingConfirmation({
  email,
  date,
  time,
  pageTitle,
  brandColor,
}: BookingConfirmationProps) {
  const dateObj = new Date(`${date}T${time}:00`);

  return (
    <div className="text-center py-8">
      <div
        className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{
          backgroundColor: brandColor ? brandColor + "15" : undefined,
        }}
      >
        <CheckCircle2
          className="h-8 w-8"
          style={{ color: brandColor || "hsl(var(--brand))" }}
        />
      </div>

      <h2 className="text-2xl font-bold mb-2">Rendez-vous confirmé !</h2>

      <p className="text-muted-foreground mb-6">
        Un email de confirmation a été envoyé à{" "}
        <strong className="text-foreground">{email}</strong>
      </p>

      <div className="inline-block rounded-xl border border-border/50 bg-muted/30 px-6 py-4">
        {pageTitle && <p className="text-sm font-semibold mb-2">{pageTitle}</p>}
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {format(dateObj, "EEEE d MMMM yyyy", { locale: fr })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {time}
          </span>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground/50">
        Powered by SalesSystem
      </p>
    </div>
  );
}
