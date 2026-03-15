"use client";

import { useState, useTransition } from "react";
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
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Minus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts";
import { getBenchmarkData } from "@/lib/actions/analytics";

interface MemberStats {
  id: string;
  name: string;
  role: string;
  dealsCount: number;
  totalDeals: number;
  revenue: number;
  avgDealValue: number;
  conversionRate: number;
  prevRevenue: number;
  prevDealsCount: number;
}

interface TeamAvg {
  dealsCount: number;
  revenue: number;
  avgDealValue: number;
  conversionRate: number;
}

interface Summary {
  totalRevenue: number;
  prevTotalRevenue: number;
  revenueChange: number;
  totalClosedDeals: number;
  prevTotalClosedDeals: number;
  dealsChange: number;
  avgValue: number;
  prevAvgValue: number;
  avgValueChange: number;
}

interface BenchmarkData {
  members: MemberStats[];
  teamAvg: TeamAvg;
  summary: Summary;
}

function ChangeIndicator({ value }: { value: number }) {
  if (Math.abs(value) < 0.1) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#7af17a" }}>
        <ArrowUpRight className="h-3 w-3" />
        +{value.toFixed(1)}%
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-red-500">
      <ArrowDownRight className="h-3 w-3" />
      {value.toFixed(1)}%
    </span>
  );
}

function CompareIndicator({ value, avg }: { value: number; avg: number }) {
  if (avg === 0) return null;
  const diff = ((value - avg) / avg) * 100;
  if (Math.abs(diff) < 1) {
    return <span className="text-xs text-muted-foreground">=</span>;
  }
  if (diff > 0) {
    return (
      <span className="text-xs font-medium" style={{ color: "#7af17a" }}>
        +{diff.toFixed(0)}%
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-500">
      {diff.toFixed(0)}%
    </span>
  );
}

export function BenchmarkingView({ initialData }: { initialData: BenchmarkData }) {
  const [data, setData] = useState<BenchmarkData>(initialData);
  const [period, setPeriod] = useState("current");
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
    startTransition(async () => {
      const newData = await getBenchmarkData(value as "current" | "previous" | "quarter");
      setData(newData);
    });
  };

  const { members, teamAvg, summary } = data;

  // Prepare radar chart data for top 5 performers
  const top5 = members.slice(0, 5);

  // Normalize values for radar (0-100 scale)
  const maxRevenue = Math.max(...members.map((m) => m.revenue), 1);
  const maxDeals = Math.max(...members.map((m) => m.dealsCount), 1);
  const maxAvgDeal = Math.max(...members.map((m) => m.avgDealValue), 1);

  const radarData = [
    { metric: "CA", ...Object.fromEntries(top5.map((m) => [m.name, Math.round((m.revenue / maxRevenue) * 100)])) },
    { metric: "Deals", ...Object.fromEntries(top5.map((m) => [m.name, Math.round((m.dealsCount / maxDeals) * 100)])) },
    { metric: "Panier moyen", ...Object.fromEntries(top5.map((m) => [m.name, Math.round((m.avgDealValue / maxAvgDeal) * 100)])) },
    { metric: "Conversion", ...Object.fromEntries(top5.map((m) => [m.name, Math.round(m.conversionRate)])) },
  ];

  const radarColors = ["#7af17a", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444"];

  // Bar chart data: revenue per member
  const barData = members.map((m) => ({
    name: m.name.split(" ")[0],
    revenue: m.revenue,
    moyenne: Math.round(teamAvg.revenue),
  }));

  const summaryCards = [
    {
      title: "CA total",
      value: `${summary.totalRevenue.toLocaleString("fr-FR")} \u20AC`,
      prev: `${summary.prevTotalRevenue.toLocaleString("fr-FR")} \u20AC`,
      change: summary.revenueChange,
      icon: DollarSign,
    },
    {
      title: "Deals conclus",
      value: summary.totalClosedDeals.toString(),
      prev: summary.prevTotalClosedDeals.toString(),
      change: summary.dealsChange,
      icon: Target,
    },
    {
      title: "Panier moyen",
      value: `${summary.avgValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} \u20AC`,
      prev: `${summary.prevAvgValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} \u20AC`,
      change: summary.avgValueChange,
      icon: TrendingUp,
    },
    {
      title: "Membres actifs",
      value: members.filter((m) => m.totalDeals > 0).length.toString(),
      prev: `${members.length} total`,
      change: null,
      icon: Users,
    },
  ];

  return (
    <div>
      <PageHeader title="Benchmarking" description="Comparaisons individuelles et d'\u00E9quipe">
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Ce mois</SelectItem>
              <SelectItem value="previous">Mois dernier</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/analytics">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Summary cards - period vs previous */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  {card.change !== null && <ChangeIndicator value={card.change} />}
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{card.title}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {card.change !== null ? `vs. ${card.prev}` : card.prev}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison table */}
      <Card className="mb-8 border-border/50 hover:shadow-md transition-all overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Comparaison par membre</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Membre</th>
                  <th className="text-left p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">R\u00F4le</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Deals</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">vs moy.</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">CA g\u00E9n\u00E9r\u00E9</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">vs moy.</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Panier moyen</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">vs moy.</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Conversion</th>
                  <th className="text-right p-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">vs moy.</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{member.name}</td>
                    <td className="p-4 capitalize text-muted-foreground">{member.role}</td>
                    <td className="p-4 text-right">{member.dealsCount}</td>
                    <td className="p-4 text-right">
                      <CompareIndicator value={member.dealsCount} avg={teamAvg.dealsCount} />
                    </td>
                    <td className="p-4 text-right font-medium">
                      {member.revenue.toLocaleString("fr-FR")} \u20AC
                    </td>
                    <td className="p-4 text-right">
                      <CompareIndicator value={member.revenue} avg={teamAvg.revenue} />
                    </td>
                    <td className="p-4 text-right">
                      {member.avgDealValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} \u20AC
                    </td>
                    <td className="p-4 text-right">
                      <CompareIndicator value={member.avgDealValue} avg={teamAvg.avgDealValue} />
                    </td>
                    <td className="p-4 text-right">{member.conversionRate.toFixed(1)}%</td>
                    <td className="p-4 text-right">
                      <CompareIndicator value={member.conversionRate} avg={teamAvg.conversionRate} />
                    </td>
                  </tr>
                ))}
                {/* Team average row */}
                <tr className="bg-muted/50 font-semibold">
                  <td className="p-4">Moyenne \u00E9quipe</td>
                  <td className="p-4 text-muted-foreground">—</td>
                  <td className="p-4 text-right">{teamAvg.dealsCount.toFixed(1)}</td>
                  <td className="p-4 text-right">—</td>
                  <td className="p-4 text-right">
                    {teamAvg.revenue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} \u20AC
                  </td>
                  <td className="p-4 text-right">—</td>
                  <td className="p-4 text-right">
                    {teamAvg.avgDealValue.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} \u20AC
                  </td>
                  <td className="p-4 text-right">—</td>
                  <td className="p-4 text-right">{teamAvg.conversionRate.toFixed(1)}%</td>
                  <td className="p-4 text-right">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Radar chart - top performers */}
        {top5.length > 0 && (
          <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Profil des top performers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e5e5" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    {top5.map((member, i) => (
                      <Radar
                        key={member.id}
                        name={member.name}
                        dataKey={member.name}
                        stroke={radarColors[i]}
                        fill={radarColors[i]}
                        fillOpacity={0.1}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bar chart - revenue per member vs team average */}
        <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base font-semibold">CA par membre vs moyenne</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value, name) => [
                      `${Number(value).toLocaleString("fr-FR")} \u20AC`,
                      name === "revenue" ? "CA" : "Moyenne",
                    ]}
                  />
                  <Bar dataKey="revenue" fill="#7af17a" radius={[4, 4, 0, 0]} name="CA" />
                  <Bar dataKey="moyenne" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Moyenne" opacity={0.5} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {isPending && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="animate-spin h-8 w-8 border-4 border-brand border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  );
}
