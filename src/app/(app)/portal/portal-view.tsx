"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  DollarSign,
  TrendingUp,
  Heart,
  FileBarChart,
  ArrowRight,
  History,
} from "lucide-react";
import Link from "next/link";

interface Setter {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  health_score: number;
  avatar_url: string | null;
  deals_count: number;
  revenue: number;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage_id: string | null;
  assigned_to: string | null;
  created_at: string;
  assigned_user?: { full_name: string | null } | null;
}

interface PortalData {
  setters: Setter[];
  recentDeals: Deal[];
  metrics: {
    activeSetters: number;
    totalRevenue: number;
    activeDeals: number;
    avgHealthScore: number;
  };
}

const stageLabels: Record<string, string> = {
  lead: "Lead",
  qualified: "Qualifié",
  proposal: "Call booké",
  negotiation: "Négociation",
  won: "Gagné",
  lost: "Perdu",
};

export function PortalView({ data }: { data: PortalData | null }) {
  if (!data) {
    return (
      <div>
        <PageHeader
          title="Portail Entrepreneur"
          description="Vue d'ensemble de votre activité"
        />
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Aucune donnée disponible</p>
            <p className="text-sm">
              Les données apparaîtront une fois que des setters vous seront
              attribués.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { setters, recentDeals, metrics } = data;

  return (
    <div>
      <PageHeader
        title="Portail Entrepreneur"
        description="Vue d'ensemble de votre activité"
      >
        <div className="flex gap-2">
          <Link href="/portal/timeline">
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              Mon parcours
            </Button>
          </Link>
          <Link href="/portal/reports">
            <Button variant="outline">
              <FileBarChart className="h-4 w-4 mr-2" />
              Rapports
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Setters actifs
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <Users className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {metrics.activeSetters}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                CA total
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {metrics.totalRevenue.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Deals en cours
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {metrics.activeDeals}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Satisfaction
              </span>
              <div className="h-9 w-9 rounded-xl bg-rose-500/10 flex items-center justify-center ring-1 ring-rose-500/20">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {metrics.avgHealthScore}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Setters Performance Table */}
      <Card className="mb-6 overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/30 bg-muted/20">
          <CardTitle className="text-lg">Performance des Setters</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {setters.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun setter attribué</p>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-6 py-3.5 border-b border-border/50 bg-muted/10">
                <div className="col-span-4">Nom</div>
                <div className="col-span-2">Rôle</div>
                <div className="col-span-1 text-center">Deals</div>
                <div className="col-span-2 text-right">CA</div>
                <div className="col-span-3">Health Score</div>
              </div>
              {/* Rows */}
              {setters.map((setter) => (
                <div
                  key={setter.id}
                  className="grid grid-cols-12 gap-2 items-center px-6 py-3 border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium truncate">
                      {setter.full_name || setter.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {setter.email}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {setter.role}
                    </Badge>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-medium">
                      {setter.deals_count}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-medium">
                      {setter.revenue.toLocaleString("fr-FR")} €
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <Progress
                      value={setter.health_score}
                      className="flex-1 h-2"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {setter.health_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Deals */}
      <Card className="border-border/50">
        <CardHeader className="border-b border-border/30 bg-muted/20">
          <CardTitle className="text-lg">Deals récents</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {recentDeals.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun deal pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:shadow-sm transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {deal.assigned_user?.full_name || "Non assigné"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <Badge
                      variant="outline"
                      className="text-xs whitespace-nowrap"
                    >
                      {stageLabels[deal.stage_id || ""] || deal.stage_id || "—"}
                    </Badge>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {deal.value.toLocaleString("fr-FR")} €
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to reports */}
      <div className="mt-6 flex justify-center">
        <Link href="/portal/reports">
          <Button variant="ghost" className="text-muted-foreground">
            Voir les rapports détaillés
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
