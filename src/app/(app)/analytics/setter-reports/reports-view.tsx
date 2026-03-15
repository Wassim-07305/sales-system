"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  MailCheck,
  CalendarCheck,
  UserCheck,
  Users,
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface SetterMetrics {
  setterId: string;
  setterName: string;
  dmsSent: number;
  responses: number;
  responseRate: number;
  bookings: number;
  showUpRate: number;
  closingContribution: number;
  currentWeek: {
    dmsSent: number;
    responses: number;
    bookings: number;
    showUpRate: number;
  };
  previousWeek: {
    dmsSent: number;
    responses: number;
    bookings: number;
    showUpRate: number;
  };
}

interface SetterOption {
  id: string;
  name: string;
}

export function ReportsView({
  data,
  setters,
}: {
  data: SetterMetrics[];
  setters: SetterOption[];
}) {
  const [selectedSetter, setSelectedSetter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (selectedSetter === "all") return data;
    return data.filter((d) => d.setterId === selectedSetter);
  }, [data, selectedSetter]);

  // Aggregate metrics
  const totals = useMemo(() => {
    const total = filtered.reduce(
      (acc, s) => ({
        dmsSent: acc.dmsSent + s.dmsSent,
        responses: acc.responses + s.responses,
        bookings: acc.bookings + s.bookings,
        showUpRate: acc.showUpRate + s.showUpRate,
        closingContribution: acc.closingContribution + s.closingContribution,
      }),
      { dmsSent: 0, responses: 0, bookings: 0, showUpRate: 0, closingContribution: 0 }
    );
    const count = filtered.length || 1;
    return {
      ...total,
      responseRate: total.dmsSent > 0 ? (total.responses / total.dmsSent) * 100 : 0,
      avgShowUpRate: total.showUpRate / count,
    };
  }, [filtered]);

  // Radar data (normalized to 100)
  const radarData = useMemo(() => {
    if (filtered.length === 0) return [];
    const s = filtered.length === 1 ? filtered[0] : null;
    const maxDMs = Math.max(...data.map((d) => d.dmsSent), 1);
    const maxBookings = Math.max(...data.map((d) => d.bookings), 1);
    const maxContrib = Math.max(...data.map((d) => d.closingContribution), 1);

    if (s) {
      return [
        { axis: "DMs", value: Math.round((s.dmsSent / maxDMs) * 100) },
        { axis: "Taux réponse", value: Math.round(s.responseRate) },
        { axis: "Bookings", value: Math.round((s.bookings / maxBookings) * 100) },
        { axis: "Show-up", value: Math.round(s.showUpRate) },
        { axis: "Contribution CA", value: Math.round((s.closingContribution / maxContrib) * 100) },
      ];
    }
    // For "all", use average normalized
    const avg = {
      dms: totals.dmsSent / (filtered.length || 1),
      resp: totals.responseRate,
      book: totals.bookings / (filtered.length || 1),
      show: totals.avgShowUpRate,
      contrib: totals.closingContribution / (filtered.length || 1),
    };
    return [
      { axis: "DMs", value: Math.round((avg.dms / maxDMs) * 100) },
      { axis: "Taux réponse", value: Math.round(avg.resp) },
      { axis: "Bookings", value: Math.round((avg.book / maxBookings) * 100) },
      { axis: "Show-up", value: Math.round(avg.show) },
      { axis: "Contribution CA", value: Math.round((avg.contrib / maxContrib) * 100) },
    ];
  }, [data, filtered, totals]);

  // Weekly comparison chart data
  const weeklyComparison = useMemo(() => {
    return filtered.map((s) => ({
      name: s.setterName.split(" ")[0],
      "Semaine actuelle": s.currentWeek.bookings,
      "Semaine précédente": s.previousWeek.bookings,
    }));
  }, [filtered]);

  const stats = [
    {
      title: "DMs envoyés",
      value: totals.dmsSent.toLocaleString("fr-FR"),
      icon: MessageSquare,
    },
    {
      title: "Taux de réponse",
      value: `${totals.responseRate.toFixed(1)}%`,
      icon: MailCheck,
    },
    {
      title: "Bookings générés",
      value: totals.bookings.toString(),
      icon: CalendarCheck,
    },
    {
      title: "Taux show-up",
      value: `${totals.avgShowUpRate.toFixed(1)}%`,
      icon: UserCheck,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Rapports Setter"
        description="Performance détaillée des setters"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Setter Selector */}
      <div className="mb-6">
        <Select value={selectedSetter} onValueChange={setSelectedSetter}>
          <SelectTrigger className="w-[220px]">
            <Users className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Sélectionner un setter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les setters</SelectItem>
            {setters.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Radar Chart */}
        <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Forces du setter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12 }} />
                    <Radar
                      dataKey="value"
                      stroke="#7af17a"
                      fill="#7af17a"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Comparison */}
        <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Comparaison hebdomadaire (Bookings)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {weeklyComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="Semaine actuelle"
                      fill="#7af17a"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="Semaine précédente"
                      fill="#7af17a50"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Table */}
      <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Détails par setter</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Users className="h-7 w-7 opacity-40" />
              </div>
              <p className="font-medium">Aucun setter trouvé</p>
              <p className="text-sm mt-1">Les rapports setter apparaîtront ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Setter</th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">DMs</th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Réponses</th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Taux rép.</th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Bookings</th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Show-up</th>
                    <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">CA contribué</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((setter) => (
                    <tr key={setter.setterId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{setter.setterName}</td>
                      <td className="p-4 text-right">{setter.dmsSent.toLocaleString("fr-FR")}</td>
                      <td className="p-4 text-right">{setter.responses.toLocaleString("fr-FR")}</td>
                      <td className="p-4 text-right">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            setter.responseRate >= 20
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : setter.responseRate >= 10
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-red-500/10 text-red-600 border-red-500/20"
                          )}
                        >
                          {setter.responseRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-right">{setter.bookings}</td>
                      <td className="p-4 text-right">{setter.showUpRate.toFixed(0)}%</td>
                      <td className="p-4 text-right font-medium">
                        {setter.closingContribution.toLocaleString("fr-FR")} &euro;
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
