"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Flame,
  Calendar,
  Clock,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HeatmapCell {
  day: number;
  hour: number;
  value: number;
}

interface HeatmapResult {
  grid: HeatmapCell[];
  bestDay: number;
  bestHour: number;
  totalEngagement: number;
  maxValue: number;
}

const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const dayLabelsFull = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getIntensityColor(value: number, maxValue: number): string {
  if (maxValue === 0 || value === 0) return "bg-muted/30";
  const ratio = value / maxValue;
  if (ratio < 0.15) return "bg-brand/10";
  if (ratio < 0.3) return "bg-brand/20";
  if (ratio < 0.45) return "bg-brand/30";
  if (ratio < 0.6) return "bg-brand/45";
  if (ratio < 0.75) return "bg-brand/60";
  if (ratio < 0.9) return "bg-brand/75";
  return "bg-brand/90";
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}h`;
}

export function HeatmapView({ data }: { data: HeatmapResult }) {
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  // Build a quick lookup: grid[day][hour] = value
  const gridMap = new Map<string, number>();
  data.grid.forEach((cell) => {
    gridMap.set(`${cell.day}-${cell.hour}`, cell.value);
  });

  // Format best time slot
  const bestTimeSlot = `${formatHour(data.bestHour)} - ${formatHour(data.bestHour + 1)}`;

  return (
    <div>
      <PageHeader
        title="Carte de Chaleur"
        description="Engagement par jour et heure"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">{dayLabelsFull[data.bestDay]}</p>
            <p className="text-sm text-muted-foreground mt-1">Meilleur jour</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">{bestTimeSlot}</p>
            <p className="text-sm text-muted-foreground mt-1">Meilleur créneau</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">{data.totalEngagement.toLocaleString("fr-FR")}</p>
            <p className="text-sm text-muted-foreground mt-1">Engagement total</p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-brand" />
              Carte de chaleur
            </CardTitle>
            {hoveredCell && (
              <div className="text-sm text-muted-foreground">
                {dayLabelsFull[hoveredCell.day]} {formatHour(hoveredCell.hour)} :{" "}
                <span className="font-medium text-foreground">{hoveredCell.value}</span>{" "}
                interaction{hoveredCell.value > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* Hour labels */}
            <div className="flex mb-1">
              <div className="w-12 shrink-0" />
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="flex-1 min-w-[28px] text-center text-[10px] text-muted-foreground"
                >
                  {h % 3 === 0 ? formatHour(h) : ""}
                </div>
              ))}
            </div>

            {/* Grid rows */}
            {Array.from({ length: 7 }, (_, day) => (
              <div key={day} className="flex items-center gap-0 mb-0.5">
                <div className="w-12 shrink-0 text-xs font-medium text-muted-foreground text-right pr-2">
                  {dayLabels[day]}
                </div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const value = gridMap.get(`${day}-${hour}`) || 0;
                  const colorClass = getIntensityColor(value, data.maxValue);

                  return (
                    <div
                      key={hour}
                      className={cn(
                        "flex-1 min-w-[28px] h-7 rounded-sm cursor-pointer transition-all border border-transparent",
                        colorClass,
                        hoveredCell?.day === day && hoveredCell?.hour === hour
                          ? "ring-2 ring-brand ring-offset-1"
                          : "hover:ring-1 hover:ring-brand/50"
                      )}
                      onMouseEnter={() => setHoveredCell({ day, hour, value })}
                      onMouseLeave={() => setHoveredCell(null)}
                      title={`${dayLabelsFull[day]} ${formatHour(hour)}: ${value} interaction${value > 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
              <span className="text-xs text-muted-foreground">Moins</span>
              <div className="flex gap-0.5">
                <div className="w-5 h-5 rounded-sm bg-muted/30" />
                <div className="w-5 h-5 rounded-sm bg-brand/10" />
                <div className="w-5 h-5 rounded-sm bg-brand/20" />
                <div className="w-5 h-5 rounded-sm bg-brand/30" />
                <div className="w-5 h-5 rounded-sm bg-brand/45" />
                <div className="w-5 h-5 rounded-sm bg-brand/60" />
                <div className="w-5 h-5 rounded-sm bg-brand/75" />
                <div className="w-5 h-5 rounded-sm bg-brand/90" />
              </div>
              <span className="text-xs text-muted-foreground">Plus</span>
            </div>
          </div>

          {data.totalEngagement === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucune donnée d&apos;engagement</p>
              <p className="text-sm mt-1">
                La carte de chaleur se remplira avec les interactions enregistrées.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
