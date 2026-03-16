"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { getCalendarEvents, type CalendarEvent } from "@/lib/actions/calendar";
import {
  CalendarDays,
  Video,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
} from "lucide-react";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const EVENT_CONFIG: Record<
  CalendarEvent["type"],
  { color: string; bgColor: string; icon: typeof CalendarDays; label: string }
> = {
  booking: {
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
    icon: CalendarDays,
    label: "RDV",
  },
  video: {
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    icon: Video,
    label: "Appel",
  },
  event: {
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    icon: Users,
    label: "Événement",
  },
};

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(month: number, year: number) {
  // 0=Sunday, adjust so Monday=0
  const day = new Date(year, month - 1, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function CalendarView() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCalendarEvents(currentMonth, currentYear);
      setEvents(data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  function goToPreviousMonth() {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  }

  function goToNextMonth() {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  }

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  // Build calendar grid
  const cells: Array<{ day: number | null; dateStr: string }> = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: null, dateStr: "" });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(currentMonth).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ day: d, dateStr: `${currentYear}-${mm}-${dd}` });
  }
  // Fill remaining cells
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dateStr: "" });
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  function getEventsForDate(dateStr: string) {
    return events.filter((e) => e.date === dateStr);
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Vue centralisée de tous vos rendez-vous, appels et événements"
      />

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">
          {MONTHS[currentMonth - 1]} {currentYear}
        </h2>
        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4">
        {(Object.keys(EVENT_CONFIG) as Array<CalendarEvent["type"]>).map(
          (type) => {
            const config = EVENT_CONFIG[type];
            const Icon = config.icon;
            return (
              <div key={type} className="flex items-center gap-1.5 text-sm">
                <Icon className={cn("h-4 w-4", config.color)} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            );
          },
        )}
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-0">
          {/* Header row */}
          <div className="grid grid-cols-7 border-b">
            {DAYS.map((d) => (
              <div
                key={d}
                className="p-3 text-center text-sm font-medium text-muted-foreground border-r last:border-r-0"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {loading ? (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Chargement…
            </div>
          ) : (
            Array.from(
              { length: Math.ceil(cells.length / 7) },
              (_, weekIdx) => (
                <div
                  key={weekIdx}
                  className="grid grid-cols-7 border-b last:border-b-0"
                >
                  {cells
                    .slice(weekIdx * 7, weekIdx * 7 + 7)
                    .map((cell, cellIdx) => {
                      const dayEvents = cell.dateStr
                        ? getEventsForDate(cell.dateStr)
                        : [];
                      const isToday = cell.dateStr === todayStr;
                      const isSelected = cell.dateStr === selectedDate;

                      return (
                        <button
                          key={cellIdx}
                          type="button"
                          disabled={!cell.day}
                          onClick={() =>
                            cell.dateStr && setSelectedDate(cell.dateStr)
                          }
                          className={cn(
                            "p-2 min-h-[100px] border-r last:border-r-0 text-left transition-colors",
                            cell.day && "hover:bg-muted/50 cursor-pointer",
                            !cell.day && "bg-muted/20",
                            isSelected &&
                              "bg-muted/70 ring-1 ring-[#7af17a]/50",
                          )}
                        >
                          {cell.day && (
                            <>
                              <span
                                className={cn(
                                  "inline-flex items-center justify-center h-7 w-7 rounded-full text-sm",
                                  isToday &&
                                    "bg-[#7af17a] text-black font-bold",
                                )}
                              >
                                {cell.day}
                              </span>
                              <div className="mt-1 space-y-0.5">
                                {dayEvents.slice(0, 3).map((ev) => {
                                  const config = EVENT_CONFIG[ev.type];
                                  return (
                                    <div
                                      key={ev.id}
                                      className={cn(
                                        "text-xs px-1.5 py-0.5 rounded truncate",
                                        config.bgColor,
                                        config.color,
                                      )}
                                    >
                                      {ev.time ? `${ev.time} ` : ""}
                                      {ev.title.length > 18
                                        ? ev.title.substring(0, 18) + "…"
                                        : ev.title}
                                    </div>
                                  );
                                })}
                                {dayEvents.length > 3 && (
                                  <div className="text-xs text-muted-foreground pl-1">
                                    +{dayEvents.length - 3} autres
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </button>
                      );
                    })}
                </div>
              ),
            )
          )}
        </CardContent>
      </Card>

      {/* Selected day details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#7af17a]" />
              Événements du{" "}
              {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                "fr-FR",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                },
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEvents.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucun événement pour cette date.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((ev) => {
                  const config = EVENT_CONFIG[ev.type];
                  const Icon = config.icon;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            config.bgColor,
                          )}
                        >
                          <Icon className={cn("h-5 w-5", config.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ev.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {ev.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {ev.time}
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={cn("text-xs", config.color)}
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Link href={ev.link}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
