"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, ArrowDown } from "lucide-react";

interface FunnelStage {
  stage: string;
  value: number;
  color: string;
  position: number;
}

export function FunnelView({ data }: { data: FunnelStage[] }) {
  const sorted = [...data].sort((a, b) => a.position - b.position);
  const maxValue = Math.max(...sorted.map((s) => s.value), 1);

  // Find bottleneck (biggest drop %)
  let worstDropIndex = -1;
  let worstDropRate = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].value > 0) {
      const dropRate = 1 - sorted[i].value / sorted[i - 1].value;
      if (dropRate > worstDropRate) {
        worstDropRate = dropRate;
        worstDropIndex = i;
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Analyse du Funnel"
        description="Taux de conversion par étape du pipeline"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Funnel de conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6">
            {sorted.map((stage, i) => {
              const widthPercent =
                maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
              const minWidth = 20;
              const barWidth = Math.max(widthPercent, minWidth);
              const isBottleneck = i === worstDropIndex;

              return (
                <div
                  key={stage.stage}
                  className="w-full flex flex-col items-center"
                >
                  <div
                    className={`relative rounded-xl py-4 px-6 text-center transition-all duration-300 hover:shadow-md ${isBottleneck ? "ring-2 ring-red-500/60 ring-offset-2 ring-offset-background" : ""}`}
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: stage.color + "20",
                      borderLeft: `4px solid ${stage.color}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{stage.stage}</span>
                      <span className="text-xl font-bold tracking-tight">
                        {stage.value}
                      </span>
                    </div>
                    {isBottleneck && (
                      <span className="absolute -right-2 -top-2 bg-red-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-sm">
                        Goulot
                      </span>
                    )}
                  </div>
                  {i < sorted.length - 1 && (
                    <div className="flex items-center gap-2 py-1.5">
                      <ArrowDown
                        className={`h-4 w-4 ${i + 1 === worstDropIndex ? "text-red-500" : "text-muted-foreground/50"}`}
                      />
                      {sorted[i].value > 0 ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-bold tabular-nums ${i + 1 === worstDropIndex ? "text-red-500" : "text-emerald-600"}`}
                          >
                            &darr;{" "}
                            {(
                              (sorted[i + 1].value / sorted[i].value) *
                              100
                            ).toFixed(0)}
                            %
                          </span>
                          <span
                            className={`text-[11px] ${i + 1 === worstDropIndex ? "text-red-500/70" : "text-muted-foreground"}`}
                          >
                            de conversion ({sorted[i + 1].value}/{sorted[i].value})
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sorted.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <ArrowDown className="h-7 w-7 opacity-40" />
              </div>
              <p className="font-medium">Aucun deal dans le pipeline</p>
              <p className="text-sm mt-1">
                Les données du funnel apparaîtront ici.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
