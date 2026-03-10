"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/types/database";
import { DollarSign, Target, TrendingUp, Flame, Thermometer, Snowflake } from "lucide-react";

interface PipelineStatsProps {
  deals: Deal[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

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
        ? Math.round(
            deals.reduce((sum, d) => sum + (d.probability || 0), 0) / totalDeals
          )
        : 0;

    const hot = deals.filter((d) => d.temperature === "hot").length;
    const warm = deals.filter((d) => d.temperature === "warm").length;
    const cold = deals.filter((d) => d.temperature === "cold").length;

    return {
      totalDeals,
      totalValue,
      weightedValue,
      avgProbability,
      hot,
      warm,
      cold,
    };
  }, [deals]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Target className="h-3.5 w-3.5" />
            Deals actifs
          </div>
          <p className="text-2xl font-bold">{stats.totalDeals}</p>
          <div className="flex gap-1.5 mt-2">
            <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-200">
              <Flame className="h-2.5 w-2.5 mr-0.5" />
              {stats.hot}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
              <Thermometer className="h-2.5 w-2.5 mr-0.5" />
              {stats.warm}
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
              <Snowflake className="h-2.5 w-2.5 mr-0.5" />
              {stats.cold}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <DollarSign className="h-3.5 w-3.5" />
            Valeur pipeline
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Total des deals en cours
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Valeur ponderee
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats.weightedValue)}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Ajustee selon probabilite
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Target className="h-3.5 w-3.5" />
            Probabilite moyenne
          </div>
          <p className="text-2xl font-bold">{stats.avgProbability}%</p>
          <div className="w-full bg-muted rounded-full h-1.5 mt-3">
            <div
              className="bg-brand h-1.5 rounded-full transition-all"
              style={{ width: `${stats.avgProbability}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
