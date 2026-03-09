"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Booking } from "@/lib/types/database";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, User, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingCalendarProps {
  initialBookings: Booking[];
}

const statusColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  no_show: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
  rescheduled: "bg-orange-100 text-orange-700",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmé",
  completed: "Terminé",
  no_show: "No-show",
  cancelled: "Annulé",
  rescheduled: "Reprogrammé",
};

export function BookingCalendar({ initialBookings }: BookingCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"week" | "list">("week");

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentWeek, { locale: fr, weekStartsOn: 1 });
    const end = endOfWeek(currentWeek, { locale: fr, weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentWeek]);

  const bookingsForDay = (day: Date) =>
    initialBookings.filter((b) =>
      isSameDay(new Date(b.scheduled_at), day)
    );

  const upcomingBookings = initialBookings
    .filter((b) => new Date(b.scheduled_at) >= new Date() && b.status === "confirmed")
    .slice(0, 10);

  return (
    <div>
      <Tabs value={view} onValueChange={(v) => setView(v as "week" | "list")}>
        <TabsList className="mb-4">
          <TabsTrigger value="week">Semaine</TabsTrigger>
          <TabsTrigger value="list">Liste</TabsTrigger>
        </TabsList>

        <TabsContent value="week">
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-semibold">
              {format(weekDays[0], "d MMM", { locale: fr })} -{" "}
              {format(weekDays[6], "d MMM yyyy", { locale: fr })}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayBookings = bookingsForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[200px] rounded-lg border p-2",
                    isToday(day) && "border-brand bg-brand/5"
                  )}
                >
                  <div className="text-center mb-2">
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(day, "EEE", { locale: fr })}
                    </p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        isToday(day) && "text-brand"
                      )}
                    >
                      {format(day, "d")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    {dayBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-1.5 rounded bg-brand/10 text-xs cursor-pointer hover:bg-brand/20 transition-colors"
                      >
                        <p className="font-medium truncate">
                          {booking.prospect_name}
                        </p>
                        <p className="text-muted-foreground">
                          {format(new Date(booking.scheduled_at), "HH:mm")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prochains rendez-vous</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Aucun rendez-vous à venir
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                          {booking.prospect_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{booking.prospect_name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(booking.scheduled_at), "EEEE d MMMM à HH:mm", {
                                locale: fr,
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {booking.duration_minutes} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={statusColors[booking.status]}
                        >
                          {statusLabels[booking.status]}
                        </Badge>
                        <Badge variant="outline">{booking.slot_type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
