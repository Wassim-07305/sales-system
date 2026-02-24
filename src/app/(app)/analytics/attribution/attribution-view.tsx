"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Linkedin,
  Instagram,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Share2,
  MousePointerClick,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TouchpointEvent {
  id: string;
  touchpoint_type: string;
  channel: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface DealAttribution {
  dealId: string;
  dealTitle: string;
  dealValue: number;
  prospectName: string;
  touchpoints: TouchpointEvent[];
}

const channelIcons: Record<string, React.ElementType> = {
  LinkedIn: Linkedin,
  Instagram: Instagram,
  Call: Phone,
  Téléphone: Phone,
  Email: Mail,
  DM: MessageSquare,
  Website: Globe,
  Referral: Share2,
  Contenu: Globe,
};

function getChannelIcon(type: string, channel: string | null) {
  const key = channel || type;
  return channelIcons[key] || MousePointerClick;
}

function getChannelColor(type: string, channel: string | null): string {
  const key = channel || type;
  const colors: Record<string, string> = {
    LinkedIn: "bg-blue-500/10 text-blue-600 border-blue-200",
    Instagram: "bg-pink-500/10 text-pink-600 border-pink-200",
    Call: "bg-orange-500/10 text-orange-600 border-orange-200",
    Téléphone: "bg-orange-500/10 text-orange-600 border-orange-200",
    Email: "bg-purple-500/10 text-purple-600 border-purple-200",
    DM: "bg-cyan-500/10 text-cyan-600 border-cyan-200",
    Website: "bg-green-500/10 text-green-600 border-green-200",
    Referral: "bg-brand/10 text-brand border-brand/20",
    Contenu: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  };
  return colors[key] || "bg-muted text-muted-foreground border-border";
}

export function AttributionView({ data }: { data: DealAttribution[] }) {
  // Summary statistics
  const totalDeals = data.length;
  const totalTouchpoints = data.reduce((sum, d) => sum + d.touchpoints.length, 0);
  const avgTouchpoints = totalDeals > 0 ? (totalTouchpoints / totalDeals).toFixed(1) : "0";

  // Most common first touch
  const firstTouches = data
    .filter((d) => d.touchpoints.length > 0)
    .map((d) => d.touchpoints[0].channel || d.touchpoints[0].touchpoint_type);
  const firstTouchCounts = new Map<string, number>();
  firstTouches.forEach((t) => firstTouchCounts.set(t, (firstTouchCounts.get(t) || 0) + 1));
  const mostCommonFirst = firstTouchCounts.size > 0
    ? Array.from(firstTouchCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : "N/A";

  // Most common last touch
  const lastTouches = data
    .filter((d) => d.touchpoints.length > 0)
    .map((d) => {
      const last = d.touchpoints[d.touchpoints.length - 1];
      return last.channel || last.touchpoint_type;
    });
  const lastTouchCounts = new Map<string, number>();
  lastTouches.forEach((t) => lastTouchCounts.set(t, (lastTouchCounts.get(t) || 0) + 1));
  const mostCommonLast = lastTouchCounts.size > 0
    ? Array.from(lastTouchCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : "N/A";

  return (
    <div>
      <PageHeader
        title="Attribution Multi-Touch"
        description="Tracez le parcours complet de chaque deal"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{totalDeals}</p>
            <p className="text-sm text-muted-foreground mt-1">Deals analysés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{avgTouchpoints}</p>
            <p className="text-sm text-muted-foreground mt-1">Points de contact moyens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{mostCommonFirst}</p>
            <p className="text-sm text-muted-foreground mt-1">Premier contact fréquent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-2xl font-bold">{mostCommonLast}</p>
            <p className="text-sm text-muted-foreground mt-1">Dernier contact fréquent</p>
          </CardContent>
        </Card>
      </div>

      {/* Journey Cards */}
      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MousePointerClick className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucune donnée d&apos;attribution</p>
              <p className="text-sm mt-1">
                Les parcours client apparaîtront ici une fois les événements d&apos;attribution enregistrés.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((deal) => (
            <Card key={deal.dealId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{deal.dealTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{deal.prospectName}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-brand/10 text-brand px-3 py-1.5 rounded-lg">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-bold">{deal.dealValue.toLocaleString("fr-FR")} &euro;</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {deal.touchpoints.map((tp, i) => {
                    const Icon = getChannelIcon(tp.touchpoint_type, tp.channel);
                    const colorClass = getChannelColor(tp.touchpoint_type, tp.channel);

                    return (
                      <div key={tp.id} className="flex items-center shrink-0">
                        <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${colorClass} min-w-[100px]`}>
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">
                            {tp.channel || tp.touchpoint_type}
                          </span>
                          <span className="text-[10px] opacity-70">
                            {format(new Date(tp.created_at), "d MMM", { locale: fr })}
                          </span>
                        </div>
                        {i < deal.touchpoints.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground mx-1 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {deal.touchpoints.length} point{deal.touchpoints.length > 1 ? "s" : ""} de contact
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
