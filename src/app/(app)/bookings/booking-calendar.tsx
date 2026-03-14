"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Booking } from "@/lib/types/database";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
  isWithinInterval,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  ExternalLink,
  CalendarCheck,
  UserX,
  Percent,
  CalendarDays,
  List,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateBookingStatus } from "@/lib/actions/bookings";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingCalendarProps {
  initialBookings: Booking[];
}

// ─── Status config ───────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  confirmed: {
    label: "Confirmé",
    bg: "bg-brand/10 border-brand/20",
    text: "text-brand",
    dot: "bg-brand",
  },
  completed: {
    label: "Terminé",
    bg: "bg-foreground/10 border-foreground/20",
    text: "text-foreground",
    dot: "bg-foreground",
  },
  no_show: {
    label: "No-show",
    bg: "bg-muted/60 border-border/50",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  cancelled: {
    label: "Annulé",
    bg: "bg-muted/40 border-border/30",
    text: "text-muted-foreground/60",
    dot: "bg-muted-foreground/40",
  },
  rescheduled: {
    label: "Reprogrammé",
    bg: "bg-muted/50 border-border/40",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  },
};

// ─── Call result config (inspired by Rivia) ──────────────────────────
type CallResult = "vente_realisee" | "non_realisee" | "suivi_prevu" | "no_show";

const CALL_RESULTS: CallResult[] = [
  "vente_realisee",
  "non_realisee",
  "suivi_prevu",
  "no_show",
];

const CALL_RESULT_LABELS: Record<CallResult, string> = {
  vente_realisee: "Vente réalisée",
  non_realisee: "Non réalisée",
  suivi_prevu: "Suivi prévu",
  no_show: "No show",
};

const CALL_RESULT_COLORS: Record<CallResult, string> = {
  vente_realisee: "bg-brand/10 text-brand border-brand/20",
  non_realisee: "bg-foreground/10 text-foreground border-foreground/20",
  suivi_prevu: "bg-muted/60 text-muted-foreground border-border/50",
  no_show: "bg-muted/40 text-muted-foreground/60 border-border/30",
};

// ─── Time period filter ──────────────────────────────────────────────
type TimePeriod = "week" | "month" | "all";

const slotTypeLabels: Record<string, string> = {
  decouverte: "Découverte",
  closing: "Closing",
  suivi: "Suivi",
  demo: "Démo",
  autre: "Autre",
};

// ─── Main Component ──────────────────────────────────────────────────
export function BookingCalendar({ initialBookings }: BookingCalendarProps) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"week" | "list">("week");
  const [period, setPeriod] = useState<TimePeriod>("week");
  const [resultBooking, setResultBooking] = useState<Booking | null>(null);
  const [callResult, setCallResult] = useState<CallResult | "">("");
  const [callNotes, setCallNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  // ─── Filtered bookings based on time period ────────────────────────
  const filteredBookings = useMemo(() => {
    if (period === "all") return initialBookings;

    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === "week") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    return initialBookings.filter((b) =>
      isWithinInterval(new Date(b.scheduled_at), { start, end }),
    );
  }, [initialBookings, period]);

  // ─── KPI calculations ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = filteredBookings.length;
    const confirmed = filteredBookings.filter(
      (b) => b.status === "confirmed",
    ).length;
    const completed = filteredBookings.filter(
      (b) => b.status === "completed",
    ).length;
    const noShow = filteredBookings.filter(
      (b) => b.status === "no_show",
    ).length;
    const cancelled = filteredBookings.filter(
      (b) => b.status === "cancelled",
    ).length;
    const cancelRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    return { total, confirmed, completed, noShow, cancelRate };
  }, [filteredBookings]);

  // ─── Week days for calendar view ───────────────────────────────────
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { locale: fr, weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { locale: fr, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  const bookingsForDay = (day: Date) =>
    initialBookings.filter((b) => isSameDay(new Date(b.scheduled_at), day));

  // ─── Call result handler ───────────────────────────────────────────
  function handleCallResultSubmit() {
    if (!resultBooking || !callResult) return;

    const statusMap: Record<CallResult, string> = {
      vente_realisee: "completed",
      non_realisee: "completed",
      suivi_prevu: "completed",
      no_show: "no_show",
    };

    startTransition(async () => {
      const result = await updateBookingStatus(
        resultBooking.id,
        statusMap[callResult],
      );

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Résultat enregistré");
      setResultBooking(null);
      setCallResult("");
      setCallNotes("");
      router.refresh();
    });
  }

  // ─── Booking card click handler ────────────────────────────────────
  function handleBookingClick(booking: Booking, e: React.MouseEvent) {
    // If booking is confirmed or completed, allow setting call result
    if (booking.status === "confirmed" || booking.status === "completed") {
      e.preventDefault();
      setResultBooking(booking);
      setCallResult("");
      setCallNotes("");
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Time Period Filter ─────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-border/40 bg-muted/30 p-1">
          {(
            [
              { value: "week", label: "Cette semaine" },
              { value: "month", label: "Ce mois" },
              { value: "all", label: "Tout" },
            ] as { value: TimePeriod; label: string }[]
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
                period === tab.value
                  ? "bg-brand text-brand-dark font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {[
          {
            label: "Total RDV",
            value: kpis.total,
            icon: CalendarDays,
            color: "bg-brand/10 text-brand",
          },
          {
            label: "Confirmés",
            value: kpis.confirmed,
            icon: CalendarCheck,
            color: "bg-brand/10 text-brand",
          },
          {
            label: "Terminés",
            value: kpis.completed,
            icon: CheckCircle2,
            color: "bg-brand/10 text-brand",
          },
          {
            label: "No-shows",
            value: kpis.noShow,
            icon: UserX,
            color: "bg-brand/10 text-brand",
          },
          {
            label: "Taux annulation",
            value: `${kpis.cancelRate}%`,
            icon: Percent,
            color: "bg-brand/10 text-brand",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border/40 bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  kpi.color,
                )}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── View Toggle ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-border/40 bg-muted/30 p-1">
          <button
            onClick={() => setView("week")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              view === "week"
                ? "bg-brand text-brand-dark font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Semaine
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              view === "list"
                ? "bg-brand text-brand-dark font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-4 w-4" />
            Liste
          </button>
        </div>

        {/* Week navigation (only in week view) */}
        {view === "week" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[160px] text-center text-sm font-medium text-foreground">
              {format(weekDays[0], "d MMM", { locale: fr })} -{" "}
              {format(weekDays[6], "d MMM yyyy", { locale: fr })}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setCurrentWeek(new Date())}
            >
              Aujourd&apos;hui
            </Button>
          </div>
        )}
      </div>

      {/* ─── Week View ────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="grid grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const dayBookings = bookingsForDay(day);
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[220px] rounded-xl border border-border/40 bg-card p-3 shadow-sm transition-shadow hover:shadow-md",
                  isToday(day) && "border-brand ring-1 ring-brand/20",
                )}
              >
                <div className="mb-3 text-center">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {format(day, "EEE", { locale: fr })}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold",
                      isToday(day)
                        ? "bg-brand text-brand-dark"
                        : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {dayBookings.map((booking) => {
                    const config =
                      statusConfig[booking.status] || statusConfig.confirmed;
                    return (
                      <button
                        key={booking.id}
                        onClick={(e) => handleBookingClick(booking, e)}
                        className={cn(
                          "block w-full rounded-lg border p-2 text-left text-xs transition-all hover:shadow-sm",
                          config.bg,
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              config.dot,
                            )}
                          />
                          <span
                            className={cn(
                              "font-semibold truncate",
                              config.text,
                            )}
                          >
                            {booking.prospect_name}
                          </span>
                        </div>
                        <p className="text-muted-foreground pl-3">
                          {format(new Date(booking.scheduled_at), "HH:mm")}
                          {" · "}
                          {booking.duration_minutes} min
                        </p>
                      </button>
                    );
                  })}
                  {dayBookings.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground/50">
                      —
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── List View ────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="space-y-3">
          {filteredBookings.length === 0 ? (
            <Card className="rounded-xl border-border/40 shadow-sm">
              <CardContent className="py-12">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Aucun rendez-vous</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Programmez un RDV avec le bouton &quot;Nouveau RDV&quot;
                    ci-dessus
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredBookings.map((booking) => {
              const config =
                statusConfig[booking.status] || statusConfig.confirmed;
              return (
                <div
                  key={booking.id}
                  className="group flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                      {booking.prospect_name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {booking.prospect_name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(booking.scheduled_at),
                            "EEEE d MMMM à HH:mm",
                            { locale: fr },
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {booking.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border font-medium",
                        config.bg,
                        config.text,
                      )}
                    >
                      <span
                        className={cn(
                          "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                          config.dot,
                        )}
                      />
                      {config.label}
                    </Badge>
                    {/* Slot type */}
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/60 text-muted-foreground"
                    >
                      {slotTypeLabels[booking.slot_type] || booking.slot_type}
                    </Badge>
                    {/* Call result button */}
                    {(booking.status === "confirmed" ||
                      booking.status === "completed") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-primary hover:bg-primary/10"
                        onClick={() => {
                          setResultBooking(booking);
                          setCallResult("");
                          setCallNotes("");
                        }}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Résultat
                      </Button>
                    )}
                    {/* Detail link */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                      asChild
                    >
                      <Link href={`/bookings/${booking.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── Call Result Modal ────────────────────────────────────── */}
      <Dialog
        open={!!resultBooking}
        onOpenChange={(open) => {
          if (!open) {
            setResultBooking(null);
            setCallResult("");
            setCallNotes("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Résultat du call</DialogTitle>
            {resultBooking && (
              <p className="text-sm text-muted-foreground">
                {resultBooking.prospect_name} &middot;{" "}
                {format(
                  new Date(resultBooking.scheduled_at),
                  "d MMM yyyy à HH:mm",
                  { locale: fr },
                )}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {/* Result grid */}
            <div>
              <Label className="mb-2 block text-sm font-medium">
                Résultat de l&apos;appel
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {CALL_RESULTS.map((result) => (
                  <button
                    key={result}
                    type="button"
                    onClick={() => setCallResult(result)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                      callResult === result
                        ? cn(
                            CALL_RESULT_COLORS[result],
                            "border-transparent ring-2 ring-primary/20 shadow-sm",
                          )
                        : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:shadow-sm",
                    )}
                  >
                    {CALL_RESULT_LABELS[result]}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="mb-2 block text-sm font-medium">Notes</Label>
              <Textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Objections, remarques, prochaines étapes..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResultBooking(null);
                  setCallResult("");
                  setCallNotes("");
                }}
              >
                Annuler
              </Button>
              <Button
                className="bg-brand text-brand-dark hover:bg-brand/90"
                onClick={handleCallResultSubmit}
                disabled={!callResult || isPending}
              >
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
