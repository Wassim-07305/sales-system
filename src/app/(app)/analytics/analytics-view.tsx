"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type {
  StripeRevenueSummary,
  StripeRecentPayment,
  StripeSubscriptionStats,
} from "@/lib/actions/stripe";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Funnel,
  PieChart as PieChartIcon,
  CalendarDays,
  Download,
  SmilePlus,
  CreditCard,
  Info,
  RefreshCw,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  caThisMonth: number;
  caChange: number;
  activeClients: number;
  totalClients: number;
  pipelineValue: number;
  conversionRate: number;
  churnRate: number;
  revenueByMonth: { month: string; value: number }[];
  dealsByMonth: { month: string; count: number }[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  bookingsCount: number;
  showUpRate: number;
  closingRate: number;
  revenue: number;
}

type PeriodKey = "1m" | "3m" | "6m" | "12m" | "custom";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "1m", label: "Ce mois" },
  { key: "3m", label: "3 mois" },
  { key: "6m", label: "6 mois" },
  { key: "12m", label: "12 mois" },
  { key: "custom", label: "Personnalisé" },
];

const STAT_CONFIG = [
  {
    key: "ca",
    label: "CA du mois",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    ring: "ring-emerald-500/20",
  },
  {
    key: "clients",
    label: "Clients actifs",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
  },
  {
    key: "pipeline",
    label: "Pipeline",
    icon: BarChart3,
    color: "text-purple-600",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/20",
  },
  {
    key: "conversion",
    label: "Taux conversion",
    icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
  },
  {
    key: "churn",
    label: "Churn rate",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/20",
    negative: true,
  },
] as const;

const NAV_LINKS = [
  { href: "/analytics/funnel", icon: Funnel, label: "Funnel" },
  { href: "/analytics/sources", icon: PieChartIcon, label: "Sources" },
  { href: "/analytics/objections", icon: AlertTriangle, label: "Objections" },
  { href: "/analytics/projections", icon: TrendingUp, label: "Projections" },
  { href: "/analytics/benchmarking", icon: BarChart3, label: "Benchmarking" },
  { href: "/analytics/nps", icon: SmilePlus, label: "NPS & CSAT" },
];

const AVATAR_COLORS = [
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AnalyticsView({
  analytics,
  teamPerformance,
  stripeRevenue,
  stripePayments,
  stripeSubscriptions,
  stripeConfigured,
}: {
  analytics: AnalyticsData;
  teamPerformance: TeamMember[];
  stripeRevenue: StripeRevenueSummary;
  stripePayments: StripeRecentPayment[];
  stripeSubscriptions: StripeSubscriptionStats;
  stripeConfigured: boolean;
}) {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>("6m");
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  function handleExportCSV() {
    const rows = [["Mois", "CA (€)", "Deals conclus"]];
    for (let i = 0; i < filteredRevenue.length; i++) {
      const rev = filteredRevenue[i];
      const deal = filteredDeals[i];
      rows.push([
        rev?.month || "",
        String(rev?.value || 0),
        String(deal?.count || 0),
      ]);
    }
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${activePeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePeriodChange(key: PeriodKey) {
    setActivePeriod(key);
    setShowCustom(key === "custom");
  }

  const monthsToShow =
    activePeriod === "1m"
      ? 1
      : activePeriod === "3m"
        ? 3
        : activePeriod === "12m"
          ? 12
          : 6;
  const filteredRevenue = analytics.revenueByMonth.slice(-monthsToShow);
  const filteredDeals = analytics.dealsByMonth.slice(-monthsToShow);

  const statValues = [
    {
      value: `${analytics.caThisMonth.toLocaleString("fr-FR")} €`,
      change: analytics.caChange,
    },
    {
      value: analytics.activeClients.toString(),
      change: null,
      sub: `/ ${analytics.totalClients} total`,
    },
    {
      value: `${analytics.pipelineValue.toLocaleString("fr-FR")} €`,
      change: null,
    },
    { value: `${analytics.conversionRate.toFixed(1)}%`, change: null },
    { value: `${analytics.churnRate.toFixed(1)}%`, change: null },
  ];

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Tableaux de bord et métriques de performance"
      >
        <div className="flex flex-wrap gap-2">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </PageHeader>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-2 mr-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Période
          </span>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handlePeriodChange(opt.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                activePeriod === opt.key
                  ? "bg-emerald-500 text-black shadow-sm ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {activePeriod === "custom" && customFrom && customTo && (
          <Badge variant="outline" className="text-xs font-medium gap-1 ml-2">
            <CalendarDays className="h-3 w-3" />
            {new Date(customFrom).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
            {" → "}
            {new Date(customTo).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
          </Badge>
        )}
      </div>

      {showCustom && (
        <div className="flex items-end gap-3 mb-6 p-4 rounded-xl border border-border/50 bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Du
            </Label>
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-40 h-9 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Au
            </Label>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-40 h-9 text-xs"
            />
          </div>
          {customFrom && customTo && (
            <Badge variant="outline" className="mb-0.5 text-xs">
              {new Date(customFrom).toLocaleDateString("fr-FR")} →{" "}
              {new Date(customTo).toLocaleDateString("fr-FR")}
            </Badge>
          )}
        </div>
      )}

      {/* Empty state */}
      {analytics.caThisMonth === 0 &&
        analytics.pipelineValue === 0 &&
        analytics.activeClients === 0 && (
          <Card className="mb-6 border-border/50 bg-muted/10">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="font-semibold text-lg">
                Bienvenue dans vos Analytics
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Commencez par créer des deals dans le CRM pour voir vos
                métriques de performance ici.
              </p>
              <Link href="/crm">
                <Button
                  size="sm"
                  className="mt-5 bg-emerald-500 text-black hover:bg-emerald-400"
                >
                  Accéder au CRM
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {STAT_CONFIG.map((cfg, i) => {
          const Icon = cfg.icon;
          const data = statValues[i];
          return (
            <Card
              key={cfg.key}
              className="group relative overflow-hidden border-transparent bg-card shadow-sm hover:shadow-md transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center ring-1",
                      cfg.bg,
                      cfg.ring,
                    )}
                  >
                    <Icon className={cn("h-4 w-4", cfg.color)} />
                  </div>
                  {data.change != null && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                        data.change >= 0
                          ? "text-emerald-600 bg-emerald-500/10"
                          : "text-red-500 bg-red-500/10",
                      )}
                    >
                      {data.change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3" />
                      )}
                      {Math.abs(data.change).toFixed(1)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold tracking-tight">
                  {data.value}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {cfg.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Évolution du CA (
              {activePeriod === "custom"
                ? "personnalisé"
                : `${monthsToShow} mois`}
              )
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[280px]">
              {filteredRevenue.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée disponible
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={filteredRevenue}>
                    <defs>
                      <linearGradient
                        id="caGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value) => [
                        `${Number(value).toLocaleString("fr-FR")} €`,
                        "CA",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10b981"
                      fill="url(#caGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              Deals conclus par mois
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="h-[280px]">
              {filteredDeals.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Aucun deal sur cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredDeals}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#60a5fa"
                      radius={[6, 6, 0, 0]}
                      name="Deals"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stripe Revenue Section */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20 flex items-center justify-center">
                  <CreditCard className="h-3.5 w-3.5 text-purple-600" />
                </div>
                Revenus Stripe
              </CardTitle>
              {stripeRevenue.source === "local" && (
                <Badge variant="outline" className="text-[10px]">
                  Données locales
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!stripeConfigured && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <Link
                    href="/settings/api"
                    className="text-blue-500 hover:underline font-medium"
                  >
                    Connectez Stripe
                  </Link>{" "}
                  pour voir les revenus en temps réel
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                MRR
              </p>
              <p className="text-2xl font-bold tracking-tight mt-0.5">
                {stripeRevenue.mrr.toLocaleString("fr-FR")} €
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">Ce mois</p>
                <p className="text-base font-semibold">
                  {stripeRevenue.revenueThisMonth.toLocaleString("fr-FR")} €
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30">
                <p className="text-[10px] text-muted-foreground">
                  Mois dernier
                </p>
                <p className="text-base font-semibold">
                  {stripeRevenue.revenueLastMonth.toLocaleString("fr-FR")} €
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div
                className={cn(
                  "flex items-center gap-0.5 text-sm font-semibold",
                  stripeRevenue.growthRate >= 0
                    ? "text-emerald-600"
                    : "text-red-500",
                )}
              >
                {stripeRevenue.growthRate >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {Math.abs(stripeRevenue.growthRate).toFixed(1)}%
              </div>
              <span className="text-[11px] text-muted-foreground">
                vs mois précédent
              </span>
            </div>

            <div className="border-t pt-3 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Abonnements actifs
                </span>
                <span className="font-semibold tabular-nums">
                  {stripeSubscriptions.activeCount}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5" />
                  Nouveaux ce mois
                </span>
                <span className="font-semibold text-emerald-600 tabular-nums">
                  +{stripeSubscriptions.newThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <UserMinus className="h-3.5 w-3.5" />
                  Churn ce mois
                </span>
                <span className="font-semibold text-red-500 tabular-nums">
                  {stripeSubscriptions.churnedThisMonth}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Derniers paiements
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {stripePayments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Aucun paiement enregistré
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Description
                      </th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Client
                      </th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Montant
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stripePayments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {payment.date
                            ? new Date(payment.date).toLocaleDateString(
                                "fr-FR",
                                { day: "2-digit", month: "short" },
                              )
                            : "-"}
                        </td>
                        <td className="px-4 py-3 font-medium text-xs">
                          {payment.description}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {payment.customerEmail || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-xs tabular-nums">
                          {payment.amount.toLocaleString("fr-FR")}{" "}
                          {payment.currency.toUpperCase() === "EUR"
                            ? "€"
                            : payment.currency.toUpperCase()}
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

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              Performance Équipe
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Membre
                    </th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Rôle
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Appels bookés
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Show-up
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Closing
                    </th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      CA généré
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member, idx) => (
                    <tr
                      key={member.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                              getAvatarColor(member.id),
                            )}
                          >
                            {member.name
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <span className="font-medium text-xs">
                            {member.name}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] text-amber-500">
                              🏆
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground capitalize">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-xs tabular-nums">
                        {member.bookingsCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            member.showUpRate >= 80
                              ? "text-emerald-600"
                              : member.showUpRate >= 60
                                ? "text-amber-600"
                                : "text-red-500",
                          )}
                        >
                          {member.showUpRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            member.closingRate >= 30
                              ? "text-emerald-600"
                              : member.closingRate >= 15
                                ? "text-amber-600"
                                : "text-red-500",
                          )}
                        >
                          {member.closingRate.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-xs tabular-nums">
                        {member.revenue.toLocaleString("fr-FR")} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
