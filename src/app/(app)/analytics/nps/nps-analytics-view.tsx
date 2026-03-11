"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  SmilePlus,
  Meh,
  Frown,
  TrendingUp,
  MessageSquare,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import type { NpsAnalyticsResult } from "@/lib/actions/nps";

function NpsGauge({ score }: { score: number }) {
  const color = score >= 50 ? "text-green-600" : score >= 0 ? "text-amber-500" : "text-red-500";
  const bg = score >= 50 ? "bg-green-50 dark:bg-green-950/30" : score >= 0 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-red-50 dark:bg-red-950/30";
  const label = score >= 50 ? "Excellent" : score >= 0 ? "Correct" : "À améliorer";

  return (
    <div className={cn("rounded-2xl p-6 text-center", bg)}>
      <p className={cn("text-5xl font-black", color)}>{score}</p>
      <p className="text-sm text-muted-foreground mt-1">Score NPS</p>
      <p className={cn("text-xs font-medium mt-0.5", color)}>{label}</p>
    </div>
  );
}

export function NpsAnalyticsView({ data }: { data: NpsAnalyticsResult }) {
  const {
    npsScore,
    totalResponses,
    totalPending,
    promoters,
    passives,
    detractors,
    avgScore,
    distribution,
    trend,
    recentFeedback,
    csatScore,
  } = data;

  const barColors = distribution.map((d) => {
    if (d.score >= 9) return "#22c55e";
    if (d.score >= 7) return "#f59e0b";
    return "#ef4444";
  });

  return (
    <div>
      <PageHeader
        title="NPS & Satisfaction Client"
        description="Suivi du Net Promoter Score, CSAT et retours clients"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <NpsGauge score={npsScore} />

        <Card>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-brand" />
              <span className="text-xs text-muted-foreground">CSAT</span>
            </div>
            <p className="text-2xl font-bold">{csatScore}%</p>
            <p className="text-xs text-muted-foreground">Score &ge; 7/10</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Moyenne</span>
            </div>
            <p className="text-2xl font-bold">{avgScore}/10</p>
            <p className="text-xs text-muted-foreground">{totalResponses} réponses</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Réponses</span>
            </div>
            <p className="text-2xl font-bold">{totalResponses}</p>
            <p className="text-xs text-muted-foreground">
              {totalPending > 0 ? `${totalPending} en attente` : "Aucune en attente"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex flex-col justify-center h-full">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <SmilePlus className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs">Promoteurs</span>
                </div>
                <span className="text-sm font-bold text-green-600">{promoters}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Meh className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs">Passifs</span>
                </div>
                <span className="text-sm font-bold text-amber-500">{passives}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Frown className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs">Détracteurs</span>
                </div>
                <span className="text-sm font-bold text-red-500">{detractors}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribution des scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="score" />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any) => [
                      `${value} réponse${Number(value) > 1 ? "s" : ""}`,
                      "Nombre",
                    ]) as any}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {distribution.map((_, i) => (
                      <Cell key={i} fill={barColors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> 0-6 Détracteurs
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 7-8 Passifs
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> 9-10 Promoteurs
              </span>
            </div>
          </CardContent>
        </Card>

        {/* NPS Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution du NPS (6 mois)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[-100, 100]} />
                  <Tooltip
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((value: any, name: any) => {
                      const labels: Record<string, string> = {
                        nps: "NPS",
                        responses: "Réponses",
                        avg: "Moyenne",
                      };
                      return [value, labels[String(name)] || String(name)];
                    }) as any}
                  />
                  <Line
                    type="monotone"
                    dataKey="nps"
                    stroke="#7af17a"
                    strokeWidth={2.5}
                    dot={{ fill: "#7af17a", r: 4 }}
                    name="nps"
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#60a5fa"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    name="avg"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Derniers retours
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentFeedback.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Aucun retour pour le moment</p>
              <p className="text-sm">Les réponses NPS apparaîtront ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Client</th>
                    <th className="text-center p-4 font-medium">Score</th>
                    <th className="text-left p-4 font-medium">Commentaire</th>
                    <th className="text-center p-4 font-medium">Déclencheur</th>
                    <th className="text-right p-4 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFeedback.map((fb) => (
                    <tr key={fb.id} className="border-b last:border-0">
                      <td className="p-4 font-medium">{fb.clientName}</td>
                      <td className="p-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-bold",
                            fb.score >= 9
                              ? "bg-green-100 text-green-700"
                              : fb.score >= 7
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          )}
                        >
                          {fb.score}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground max-w-[300px] truncate">
                        {fb.comment || "—"}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                          {fb.triggerDay === -1 ? "Post-closing" : `Jour ${fb.triggerDay}`}
                        </span>
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {new Date(fb.respondedAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
