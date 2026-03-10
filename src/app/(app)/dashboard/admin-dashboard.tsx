"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Trophy,
  BarChart3,
  Percent,
  Target,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
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

function getStageBadgeVariant(stage: string) {
  switch (stage) {
    case "Client Signe":
      return "default";
    case "Closing":
      return "destructive";
    case "Proposition":
      return "secondary";
    default:
      return "outline";
  }
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-brand" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{data.label}</p>
          </div>
          <div className="space-y-2">
            {(data.value as Array<{ name: string; count: number }>).map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <Badge variant="secondary">{s.count}</Badge>
              </div>
            ))}
            {(data.value as Array<unknown>).length === 0 && (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === "recent_deals" && Array.isArray(data.value)) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-brand" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">{data.label}</p>
          </div>
          <div className="space-y-2">
            {(data.value as Array<{ title: string; value: number; stage: string }>).map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-1">
                <span className="truncate">{d.title}</span>
                <span className="font-semibold text-brand">{formatCurrency(d.value || 0)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Widget simple (nombre)
  const displayValue = typeof data.value === "number"
    ? type.includes("revenue") || type.includes("pipeline")
      ? formatCurrency(data.value)
      : `${data.value}${data.suffix || ""}`
    : "—";

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-brand" />
          </div>
        </div>
        <p className="text-2xl font-bold">{displayValue}</p>
        <p className="text-sm text-muted-foreground mt-1">{data.label}</p>
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
  const statCards = [
    {
      title: "CA du mois",
      value: formatCurrency(data.stats.monthlyRevenue),
      icon: DollarSign,
    },
    {
      title: "Clients actifs",
      value: data.stats.activeClients.toString(),
      icon: Users,
    },
    {
      title: "Pipeline total",
      value: formatCurrency(data.stats.pipelineTotal),
      icon: TrendingUp,
    },
    {
      title: "RDV cette semaine",
      value: data.stats.weeklyBookings.toString(),
      icon: Calendar,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de votre activite"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stat.title}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deals recents</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentDeals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun deal pour le moment.
              </p>
            ) : (
              <div className="space-y-4">
                {data.recentDeals.map((deal) => (
                  <div
                    key={deal.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {deal.contactName}
                          </span>
                          <Badge variant={getStageBadgeVariant(deal.stage)} className="text-[10px] px-1.5 py-0">
                            {deal.stage}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(deal.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prochains RDV</CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun RDV a venir.
              </p>
            ) : (
              <div className="space-y-4">
                {data.upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                        {booking.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {booking.name || "Inconnu"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.type}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(booking.time), "EEE dd MMM HH:mm", {
                        locale: fr,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setter Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-4 w-4 text-brand" />
              Performance equipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.setterStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun setter enregistre.
              </p>
            ) : (
              <div className="space-y-4">
                {data.setterStats.map((setter) => (
                  <div
                    key={setter.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                        {setter.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {setter.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {setter.dealCount} deal{setter.dealCount > 1 ? "s" : ""} ce mois
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-brand">
                      {formatCurrency(setter.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              Alertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune alerte. Tout est a jour !
              </p>
            ) : (
              <div className="space-y-4">
                {data.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.stage} — Derniere MAJ :{" "}
                        {format(new Date(alert.updated_at), "dd MMM yyyy", {
                          locale: fr,
                        })}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-500 border-orange-300">
                      Inactif
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Widgets personnalisés */}
      {customWidgets && customWidgets.length > 0 && widgetData && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Widgets personnalisés
            </h3>
            <Link
              href="/settings/dashboard-builder"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Configurer
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
