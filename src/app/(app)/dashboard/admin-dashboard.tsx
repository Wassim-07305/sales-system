"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/layout/page-header";
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Trophy,
  BarChart3,
  Percent,
  Target,
  Settings2,
  ArrowRight,
  Clock,
  Zap,
  Sparkles,
  ChevronRight,
  Phone,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompact(amount: number) {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
  return amount.toString();
}

interface AdminDashboardData {
  stats: {
    monthlyRevenue: number;
    pipelineTotal: number;
    activeClients: number;
    weeklyBookings: number;
  };
  recentDeals: Array<{
    id: string;
    title: string;
    amount: number;
    stage: string;
    contactName: string;
  }>;
  upcomingBookings: Array<{
    id: string;
    name: string;
    time: string;
    type: string;
  }>;
  setterStats: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    dealCount: number;
    revenue: number;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    stage: string;
    updated_at: string;
  }>;
}

interface CustomWidget {
  id: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
}

interface WidgetDataItem {
  value: unknown;
  label: string;
  suffix?: string;
}

const STAGE_COLORS: Record<string, string> = {
  "Prospect": "bg-muted/60 text-muted-foreground border-border/60",
  "Contacté": "bg-muted/60 text-muted-foreground border-border/60",
  "Appel Découverte": "bg-muted/60 text-muted-foreground border-border/60",
  "Proposition": "bg-muted/60 text-muted-foreground border-border/60",
  "Closing": "bg-foreground/5 text-foreground border-foreground/10",
  "Client Signé": "bg-foreground/5 text-foreground border-foreground/10",
};

const AVATAR_COLORS = [
  "bg-zinc-700", "bg-zinc-600", "bg-zinc-700", "bg-zinc-600",
  "bg-zinc-700", "bg-zinc-600", "bg-zinc-700", "bg-zinc-600",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const WIDGET_ICONS: Record<string, typeof DollarSign> = {
  revenue_month: DollarSign,
  deals_count: BarChart3,
  conversion_rate: Percent,
  pipeline_value: Target,
  top_sources: TrendingUp,
  recent_deals: Trophy,
};

function CustomWidgetCard({ type, data }: { type: string; data: WidgetDataItem }) {
  const Icon = WIDGET_ICONS[type] || BarChart3;

  if (type === "top_sources" && Array.isArray(data.value)) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{data.label}</p>
          </div>
          <div className="space-y-2.5">
            {(data.value as Array<{ name: string; count: number }>).map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.name}</span>
                <span className="text-sm font-semibold">{s.count}</span>
              </div>
            ))}
            {(data.value as Array<unknown>).length === 0 && (
              <p className="text-xs text-muted-foreground/60">Aucune donnée</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "recent_deals" && Array.isArray(data.value)) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center">
              <Icon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">{data.label}</p>
          </div>
          <div className="space-y-2.5">
            {(data.value as Array<{ title: string; value: number; stage: string }>).map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm truncate mr-3">{d.title}</span>
                <span className="text-sm font-bold shrink-0">{formatCurrency(d.value || 0)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayValue = typeof data.value === "number"
    ? type.includes("revenue") || type.includes("pipeline")
      ? formatCurrency(data.value)
      : `${data.value}${data.suffix || ""}`
    : "—";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{data.label}</p>
        </div>
        <p className="text-2xl font-bold tracking-tight">{displayValue}</p>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({
  data,
  customWidgets,
  widgetData,
}: {
  data: AdminDashboardData;
  customWidgets?: CustomWidget[];
  widgetData?: Record<string, unknown>;
}) {
  const isEmpty = data.stats.monthlyRevenue === 0 && data.stats.pipelineTotal === 0
    && data.stats.activeClients === 0 && data.stats.weeklyBookings === 0;

  const statCards = [
    {
      title: "CA du mois",
      value: formatCurrency(data.stats.monthlyRevenue),
      compact: formatCompact(data.stats.monthlyRevenue),
      icon: DollarSign,
      href: "/analytics",
    },
    {
      title: "Pipeline total",
      value: formatCurrency(data.stats.pipelineTotal),
      compact: formatCompact(data.stats.pipelineTotal),
      icon: TrendingUp,
      href: "/crm",
    },
    {
      title: "Clients actifs",
      value: data.stats.activeClients.toString(),
      compact: data.stats.activeClients.toString(),
      icon: Users,
      href: "/contacts",
    },
    {
      title: "RDV cette semaine",
      value: data.stats.weeklyBookings.toString(),
      compact: data.stats.weeklyBookings.toString(),
      icon: Calendar,
      href: "/bookings",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de votre activité"
      />

      {/* Welcome banner */}
      {isEmpty && (
        <Card className="border-brand/20 bg-gradient-to-br from-brand/5 via-brand/3 to-transparent overflow-hidden relative">
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="h-14 w-14 rounded-2xl bg-brand/15 flex items-center justify-center shrink-0">
                <Sparkles className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Bienvenue sur votre Dashboard</h2>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Votre espace est prêt. Commencez par créer un deal dans le CRM pour voir vos métriques apparaître ici en temps réel.
                </p>
              </div>
              <Link href="/crm">
                <Button className="bg-brand text-brand-dark hover:bg-brand/90 gap-2">
                  Accéder au CRM
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        </Card>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href} className="group">
              <Card className="h-full transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 group-hover:border-foreground/10 border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1.5 uppercase tracking-wider">
                    {stat.title}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Deals + Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Deals récents
              </CardTitle>
              <Link href="/crm" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Target className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Aucun deal</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Créez votre premier deal dans le CRM</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.recentDeals.slice(0, 5).map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/crm/${deal.id}`}
                    className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                        getAvatarColor(deal.contactName || deal.id),
                      )}>
                        {deal.contactName?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{deal.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground truncate">
                            {deal.contactName}
                          </span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-px rounded-md font-medium border",
                            STAGE_COLORS[deal.stage] || "bg-muted text-muted-foreground border-border",
                          )}>
                            {deal.stage}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-bold shrink-0 ml-3">
                      {formatCurrency(deal.amount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Prochains RDV
              </CardTitle>
              <Link href="/bookings" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Voir tout <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Aucun RDV prévu</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Les prochains rendez-vous apparaîtront ici</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.upcomingBookings.slice(0, 5).map((booking) => {
                  const bookingDate = new Date(booking.time);
                  const isToday = new Date().toDateString() === bookingDate.toDateString();
                  return (
                    <Link
                      key={booking.id}
                      href={`/bookings/${booking.id}`}
                      className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex flex-col items-center justify-center text-center shrink-0 border",
                          isToday ? "bg-foreground/5 border-foreground/10 text-foreground" : "bg-muted/50 border-transparent text-muted-foreground",
                        )}>
                          <span className="text-[10px] font-bold uppercase leading-none">
                            {format(bookingDate, "EEE", { locale: fr })}
                          </span>
                          <span className="text-sm font-bold leading-tight">
                            {format(bookingDate, "dd")}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{booking.name || "Inconnu"}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground/60" />
                            <span className="text-[11px] text-muted-foreground">
                              {format(bookingDate, "HH:mm")}
                            </span>
                            <span className="text-[11px] text-muted-foreground/40">·</span>
                            <span className="text-[11px] text-muted-foreground">{booking.type}</span>
                          </div>
                        </div>
                      </div>
                      {isToday && (
                        <Badge variant="outline" className="bg-foreground/5 text-foreground border-foreground/10 text-[10px] font-semibold">
                          Aujourd&apos;hui
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid: Performance + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Performance */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Performance équipe
              </CardTitle>
              <Link href="/team/leaderboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Classement <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.setterStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Aucun membre</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Invitez votre équipe pour suivre les performances</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.setterStats.slice(0, 5).map((setter, index) => {
                  const maxRevenue = Math.max(...data.setterStats.map((s) => s.revenue), 1);
                  const percent = (setter.revenue / maxRevenue) * 100;
                  return (
                    <div
                      key={setter.id}
                      className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-xs font-bold text-muted-foreground/50 w-4 text-center">
                        {index + 1}
                      </span>
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                        getAvatarColor(setter.id),
                      )}>
                        {setter.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{setter.full_name || "Sans nom"}</p>
                          <span className="text-sm font-bold shrink-0 ml-2">
                            {formatCurrency(setter.revenue)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground/25 rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {setter.dealCount} deal{setter.dealCount > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center ring-1 ring-border/50">
                  <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                Alertes
                {data.alerts.length > 0 && (
                  <span className="ml-1 h-5 min-w-5 px-1.5 rounded-full bg-foreground/10 text-foreground text-[10px] font-bold flex items-center justify-center">
                    {data.alerts.length}
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {data.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Tout est à jour</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Aucune alerte, continuez comme ça !</p>
              </div>
            ) : (
              <div className="space-y-1">
                {data.alerts.slice(0, 5).map((alert) => {
                  const updatedDate = new Date(alert.updated_at);
                  const daysAgo = Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
                  const severity = daysAgo > 14 ? "critical" : daysAgo > 7 ? "warning" : "info";
                  return (
                    <Link
                      key={alert.id}
                      href={`/crm/${alert.id}`}
                      className={cn(
                        "flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg transition-colors",
                        "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "h-2 w-2 rounded-full shrink-0",
                          severity === "critical" ? "bg-foreground" : "bg-muted-foreground/40",
                        )} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{alert.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "text-[10px] px-1.5 py-px rounded-md font-medium border",
                              STAGE_COLORS[alert.stage] || "bg-muted text-muted-foreground border-border",
                            )}>
                              {alert.stage}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">·</span>
                            <span className={cn(
                              "text-[10px]",
                              severity === "critical" ? "text-foreground font-medium" : "text-muted-foreground/60",
                            )}>
                              {formatDistanceToNow(updatedDate, { locale: fr, addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] shrink-0",
                          severity === "critical"
                            ? "text-foreground border-foreground/20 bg-foreground/5"
                            : "text-muted-foreground border-border/60 bg-muted/30",
                        )}
                      >
                        {severity === "critical" ? "Urgent" : "Inactif"}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custom Widgets */}
      {customWidgets && customWidgets.length > 0 && widgetData && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
              <Settings2 className="h-3.5 w-3.5" />
              Widgets personnalisés
            </h3>
            <Link
              href="/settings/dashboard-builder"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Configurer <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {customWidgets.map((widget) => (
              <CustomWidgetCard
                key={widget.id}
                type={widget.type}
                data={(widgetData[widget.type] as WidgetDataItem) || { value: null, label: widget.type }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
