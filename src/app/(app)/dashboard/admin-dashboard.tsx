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
} from "lucide-react";
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
    case "Client Signé":
      return "default";
    case "Closing":
      return "destructive";
    case "Proposition":
      return "secondary";
    default:
      return "outline";
  }
}

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
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
        description="Vue d'ensemble de votre activité"
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
            <CardTitle className="text-lg">Deals récents</CardTitle>
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
                Aucun RDV à venir.
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
              Performance équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.setterStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun setter enregistré.
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
                Aucune alerte. Tout est à jour !
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
                        {alert.stage} — Dernière MAJ :{" "}
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
    </div>
  );
}
