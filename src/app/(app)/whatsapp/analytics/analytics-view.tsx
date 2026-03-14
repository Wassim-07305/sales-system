"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  MessageCircle,
  TrendingUp,
  Zap,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface SequenceStat {
  id: string;
  name: string;
  is_active: boolean;
  total_sent: number;
  total_received: number;
  response_rate: number;
  steps_count: number;
}

interface AnalyticsData {
  totalSent: number;
  totalReceived: number;
  responseRate: number;
  activeSequences: number;
  totalSequences: number;
  messagesPerDay: Array<{
    date: string;
    label: string;
    sent: number;
    received: number;
  }>;
  sequenceStats: SequenceStat[];
}

export function WhatsAppAnalyticsView({
  analytics,
}: {
  analytics: AnalyticsData | null;
}) {
  if (!analytics) {
    return (
      <div>
        <PageHeader
          title="Analytics WhatsApp"
          description="Statistiques de vos campagnes WhatsApp"
        >
          <Link href="/whatsapp">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </PageHeader>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <MessageCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="font-medium">Aucune donnée disponible</p>
            <p className="text-sm mt-1">
              Connectez votre WhatsApp et envoyez des messages pour voir vos
              statistiques.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    totalSent,
    totalReceived,
    responseRate,
    activeSequences,
    messagesPerDay,
    sequenceStats,
  } = analytics;

  return (
    <div>
      <PageHeader
        title="Analytics WhatsApp"
        description="Statistiques de vos campagnes WhatsApp"
      >
        <Link href="/whatsapp">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#7af17a]/10 ring-1 ring-[#7af17a]/20 flex items-center justify-center">
                <Send className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalSent}</p>
                <p className="text-xs text-muted-foreground">
                  Messages envoy&eacute;s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#60a5fa]/10 ring-1 ring-[#60a5fa]/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-[#60a5fa]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalReceived}</p>
                <p className="text-xs text-muted-foreground">
                  Messages re&ccedil;us
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{responseRate}%</p>
                <p className="text-xs text-muted-foreground">
                  Taux de r&eacute;ponse
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeSequences}</p>
                <p className="text-xs text-muted-foreground">
                  S&eacute;quences actives
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">
            Messages envoy&eacute;s vs re&ccedil;us (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={messagesPerDay}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => `Date : ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px" }}
                />
                <Bar
                  dataKey="sent"
                  name="Envoyés"
                  fill="#7af17a"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="received"
                  name="Reçus"
                  fill="#60a5fa"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Sequences Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Performance des s&eacute;quences
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sequenceStats.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Zap className="h-7 w-7 text-muted-foreground" />
              </div>
              Aucune s&eacute;quence cr&eacute;&eacute;e
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>S&eacute;quence</TableHead>
                  <TableHead className="text-center">&Eacute;tapes</TableHead>
                  <TableHead className="text-center">Envoy&eacute;s</TableHead>
                  <TableHead className="text-center">Re&ccedil;us</TableHead>
                  <TableHead className="text-center">
                    Taux de r&eacute;ponse
                  </TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequenceStats.map((seq) => (
                  <TableRow key={seq.id}>
                    <TableCell className="font-medium">{seq.name}</TableCell>
                    <TableCell className="text-center">
                      {seq.steps_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {seq.total_sent}
                    </TableCell>
                    <TableCell className="text-center">
                      {seq.total_received}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          seq.response_rate >= 50
                            ? "text-[#7af17a] font-semibold"
                            : seq.response_rate >= 25
                            ? "text-amber-500 font-semibold"
                            : "text-muted-foreground"
                        }
                      >
                        {seq.response_rate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          seq.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border/40"
                        }
                      >
                        {seq.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
