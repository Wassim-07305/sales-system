"use client";

import { useState } from "react";
import {
  MessageCircle,
  TrendingUp,
  BarChart3,
  Clock,
  Users,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  copyCommentToStyle,
  type EngageStats,
  type CommentHistory,
} from "@/lib/actions/linkedin-engage";

interface Props {
  stats: EngageStats;
  topComments: CommentHistory[];
  topCreators: Array<{
    name: string;
    commentsCount: number;
    totalImpressions: number;
  }>;
  hourlyStats: Array<{ hour: number; count: number; impressions: number }>;
}

export function StatsView({
  stats,
  topComments,
  topCreators,
  hourlyStats,
}: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopyToStyle(text: string, id: string) {
    try {
      await copyCommentToStyle(text);
      setCopiedId(id);
      toast.success("Commentaire ajouté à vos exemples de style");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erreur");
    }
  }

  const chartData = hourlyStats.map((h) => ({
    name: `${h.hour}h`,
    commentaires: h.count,
    impressions: h.impressions,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiques"
        description="Analysez vos performances de commentaires LinkedIn"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.commentsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalImpressions.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-muted-foreground">Impressions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgRepliesRate}%</p>
                <p className="text-xs text-muted-foreground">Taux réponse</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.bestHour !== null ? `${stats.bestHour}h` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Meilleure heure</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly chart */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Activité par heure
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.some((d) => d.commentaires > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="commentaires"
                  fill="#7af17a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-12">
              Pas encore de données. Commencez à commenter pour voir vos stats.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top comments */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Top commentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topComments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucun commentaire encore
              </p>
            ) : (
              <div className="space-y-3">
                {topComments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-muted/50 space-y-2"
                  >
                    <p className="text-sm line-clamp-2">{c.comment_text}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{c.creator_name || "—"}</span>
                        <span>{c.impressions} impr.</span>
                        <span>{c.replies_count} rép.</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() =>
                          handleCopyToStyle(c.comment_text, c.id)
                        }
                      >
                        {copiedId === c.id ? (
                          <Check className="h-3 w-3 mr-1 text-brand" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Réutiliser
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top creators */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Top créateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCreators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune donnée encore
              </p>
            ) : (
              <div className="space-y-2">
                {topCreators.map((creator, idx) => (
                  <div
                    key={creator.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {creator.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {creator.commentsCount} commentaires ·{" "}
                        {creator.totalImpressions} impressions
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {creator.totalImpressions} impr.
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
