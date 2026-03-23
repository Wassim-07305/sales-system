"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Clock, User } from "lucide-react";
import { DAYS_OF_WEEK } from "@/lib/constants";
import type { BookingAvailability } from "@/lib/types/database";
import {
  getBookingAvailability,
  createAvailability,
  deleteAvailability,
  getClosers,
} from "@/lib/actions/booking-pages";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvailabilityEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageId: string;
  pageTitle: string;
}

interface CloserOption {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export function AvailabilityEditor({
  open,
  onOpenChange,
  pageId,
  pageTitle,
}: AvailabilityEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [availability, setAvailability] = useState<BookingAvailability[]>([]);
  const [closers, setClosers] = useState<CloserOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [closerId, setCloserId] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  function toggleDay(dayValue: number) {
    setSelectedDays((prev) =>
      prev.includes(dayValue)
        ? prev.filter((d) => d !== dayValue)
        : [...prev, dayValue].sort((a, b) => a - b),
    );
  }

  /* eslint-disable react-hooks/immutability */
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, pageId]);
  /* eslint-enable react-hooks/immutability */

  async function loadData() {
    setLoading(true);
    const [availRes, closersList] = await Promise.all([
      getBookingAvailability(pageId),
      getClosers(),
    ]);
    setAvailability(availRes.availability);
    setClosers(closersList);
    if (closersList.length > 0 && !closerId) {
      setCloserId(closersList[0].id);
    }
    setLoading(false);
  }

  function handleAdd() {
    if (!closerId) {
      toast.error("Sélectionnez un closer");
      return;
    }

    if (selectedDays.length === 0) {
      toast.error("Sélectionnez au moins un jour");
      return;
    }

    if (startTime >= endTime) {
      toast.error("L'heure de début doit être avant l'heure de fin");
      return;
    }

    startTransition(async () => {
      let hasError = false;
      for (const day of selectedDays) {
        const result = await createAvailability({
          booking_page_id: pageId,
          closer_id: closerId,
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
        });
        if (result.error) {
          toast.error(result.error);
          hasError = true;
          break;
        }
      }

      if (!hasError) {
        toast.success(
          selectedDays.length > 1
            ? `${selectedDays.length} créneaux ajoutés`
            : "Disponibilité ajoutée",
        );
      }
      loadData();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteAvailability(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Disponibilité supprimée");
      setAvailability((prev) => prev.filter((a) => a.id !== id));
    });
  }

  // Group availability by closer
  const groupedByCloser = availability.reduce(
    (acc, a) => {
      const name =
        (a.closer as unknown as CloserOption)?.full_name || "Inconnu";
      if (!acc[name]) acc[name] = [];
      acc[name].push(a);
      return acc;
    },
    {} as Record<string, BookingAvailability[]>,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Disponibilités — {pageTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Add form */}
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Ajouter un créneau</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Closer
                  </Label>
                  <Select value={closerId} onValueChange={setCloserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {closers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name || c.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Jours
                  </Label>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {DAYS_OF_WEEK.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        className={cn(
                          "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                          selectedDays.includes(d.value)
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                            : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Début
                  </Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Fin
                  </Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleAdd}
                disabled={isPending}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                size="sm"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Ajouter
              </Button>
            </div>

            {/* Current availability */}
            {Object.keys(groupedByCloser).length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Aucune disponibilité configurée
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedByCloser).map(([name, slots]) => (
                  <div key={name} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <div className="space-y-1.5 pl-6">
                      {slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-lg border border-border/30 bg-card px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <Badge
                              variant="outline"
                              className="rounded-full border-border/50 text-xs"
                            >
                              {
                                DAYS_OF_WEEK.find(
                                  (d) => d.value === slot.day_of_week,
                                )?.short
                              }
                            </Badge>
                            <span className="text-muted-foreground">
                              {slot.start_time.slice(0, 5)} —{" "}
                              {slot.end_time.slice(0, 5)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => handleDelete(slot.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
