"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Deal } from "@/lib/types/database";
import { Target, DollarSign, TrendingUp, Gauge, Flame, Thermometer, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

interface PipelineStatsProps {
  deals: Deal[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")} M€`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")} k€`;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

const STAT_CONFIG = [
  {
    key: "deals",
    label: "Deals actifs",
    icon: Target,
    color: "text-brand",
    bg: "bg-brand/10",
    ring: "ring-brand/20",
  },
  {
    key: "value",
    label: "Valeur pipeline",
    icon: DollarSign,
    color: "text-brand",
    bg: "bg-brand/10",
    ring: "ring-brand/20",
  },
  {
    key: "weighted",
    label: "Valeur pondérée",
    icon: TrendingUp,
    color: "text-brand",
    bg: "bg-brand/10",
    ring: "ring-brand/20",
  },
  {
    key: "probability",
    label: "Probabilité moy.",
    icon: Gauge,
    color: "text-brand",
    bg: "bg-brand/10",
    ring: "ring-brand/20",
  },
] as const;

export function PipelineStats({ deals }: PipelineStatsProps) {
  const stats = useMemo(() => {
    const totalDeals = deals.length;
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const weightedValue = deals.reduce(
      (sum, d) => sum + (d.value || 0) * ((d.probability || 0) / 100),
      0
    );
    const avgProbability =
      totalDeals > 0
        ? Math.round(deals.reduce((sum, d) => sum + (d.probability || 0), 0) / totalDeals)
        : 0;

    const hot = deals.filter((d) => d.temperature === "hot").length;
    const warm = deals.filter((d) => d.temperature === "warm").length;
    const cold = deals.filter((d) => d.temperature === "cold").length;

    return { totalDeals, totalValue, weightedValue, avgProbability, hot, warm, cold };
  }, [deals]);

  const values = [
    stats.totalDeals.toString(),
    formatCurrency(stats.totalValue),
    formatCurrency(stats.weightedValue),
    `${stats.avgProbability}%`,
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {STAT_CONFIG.map((cfg, i) => {
        const Icon = cfg.icon;
        return (
          <Card key={cfg.key} className="group relative overflow-hidden border-transparent bg-card shadow-sm hover:shadow-md transition-all duration-200 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center ring-1", cfg.bg, cfg.ring)}>
                  <Icon className={cn("h-4.5 w-4.5", cfg.color)} />
                </div>
                {cfg.key === "deals" && (
                  <div className="flex gap-1">
                    {stats.hot > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-foreground bg-foreground/10 px-1.5 py-0.5 rounded-md">
                        <Flame className="h-2.5 w-2.5" />{stats.hot}
                      </span>
                    )}
                    {stats.warm > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-md">
                        <Thermometer className="h-2.5 w-2.5" />{stats.warm}
                      </span>
                    )}
                    {stats.cold > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground/60 bg-muted/40 px-1.5 py-0.5 rounded-md">
                        <Snowflake className="h-2.5 w-2.5" />{stats.cold}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold tracking-tight">{values[i]}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{cfg.label}</p>
              {cfg.key === "probability" && (
                <div className="w-full bg-muted rounded-full h-1.5 mt-2.5">
                  <div
                    className="bg-brand/50 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.avgProbability}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
