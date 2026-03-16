"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  getMatchingMatrixData,
  type MatchingDuo,
} from "@/lib/actions/matching-matrix";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  MessageSquare,
  Phone,
  DollarSign,
} from "lucide-react";

const SCORE_CONFIG: Record<
  MatchingDuo["score"],
  { label: string; color: string; bgColor: string }
> = {
  good: {
    label: "Bon",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
  average: {
    label: "Moyen",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  poor: {
    label: "Faible",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}

export function MatchingMatrixView() {
  const [duos, setDuos] = useState<MatchingDuo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMatchingMatrixData();
        setDuos(data.duos);
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const totalRevenue = duos.reduce((s, d) => s + d.totalRevenue, 0);
  const totalDeals = duos.reduce((s, d) => s + d.dealCount, 0);
  const totalConversations = duos.reduce((s, d) => s + d.conversationCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matrice Matching"
        description="Performance des duos Setter / Entrepreneur"
      />

      <Link href="/team">
        <Button variant="ghost" size="sm" className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour Équipe
        </Button>
      </Link>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Duos actifs",
            value: duos.length,
            icon: Users,
            color: "text-[#7af17a]",
          },
          {
            label: "Deals totaux",
            value: totalDeals,
            icon: TrendingUp,
            color: "text-blue-400",
          },
          {
            label: "CA généré",
            value: formatCurrency(totalRevenue),
            icon: DollarSign,
            color: "text-emerald-400",
          },
          {
            label: "Conversations",
            value: totalConversations,
            icon: MessageSquare,
            color: "text-purple-400",
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4 text-center">
                <Icon className={cn("h-6 w-6 mx-auto mb-2", stat.color)} />
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Matrix table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Chargement de la matrice…
            </div>
          ) : duos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-30" />
              <p>Aucun duo setter/entrepreneur configuré</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Setter</TableHead>
                  <TableHead className="w-[200px]">Entrepreneur</TableHead>
                  <TableHead className="text-center">Deals</TableHead>
                  <TableHead className="text-center">CA généré</TableHead>
                  <TableHead className="text-center">Conversations</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {duos.map((duo) => {
                  const scoreConfig = SCORE_CONFIG[duo.score];
                  return (
                    <TableRow key={`${duo.setterId}-${duo.entrepreneurId}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={duo.setterAvatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(duo.setterName)}
                            </AvatarFallback>
                          </Avatar>
                          <Link
                            href={`/profile/${duo.setterId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {duo.setterName}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={duo.entrepreneurAvatar || undefined}
                            />
                            <AvatarFallback className="text-xs">
                              {getInitials(duo.entrepreneurName)}
                            </AvatarFallback>
                          </Avatar>
                          <Link
                            href={`/profile/${duo.entrepreneurId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {duo.entrepreneurName}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{duo.dealCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatCurrency(duo.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-center">
                        {duo.conversationCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "border-0",
                            scoreConfig.bgColor,
                            scoreConfig.color,
                          )}
                        >
                          {scoreConfig.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
