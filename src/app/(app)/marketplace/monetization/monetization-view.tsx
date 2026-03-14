"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Package,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Check,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { requestPayout } from "@/lib/actions/monetization";

interface MonetizationOverview {
  totalRevenue: number;
  commissionsThisMonth: number;
  activeSubscriptions: number;
  nextPayout: number;
  nextPayoutDate: string | null;
  revenueByMonth: { month: string; revenue: number }[];
  topExtensions: {
    name: string;
    installs: number;
    revenue: number;
    growth: number;
  }[];
}

interface ExtensionPricing {
  id: string;
  name: string;
  description: string;
  tiers: {
    name: string;
    price: number;
    features: string[];
  }[];
}

interface Payout {
  id: string;
  date: string;
  amount: number;
  status: string;
  method: string;
}

interface CommissionRate {
  type: string;
  rate: string;
  description: string;
  example: string;
}

export function MonetizationView({
  overview,
  pricing,
  payouts,
  commissions,
}: {
  overview: MonetizationOverview;
  pricing: ExtensionPricing[];
  payouts: Payout[];
  commissions: CommissionRate[];
}) {
  const [payoutAmount, setPayoutAmount] = useState("");
  const [installCount, setInstallCount] = useState("");
  const [isPending, startTransition] = useTransition();

  const stats = [
    {
      title: "Revenu total",
      value: `${overview.totalRevenue.toLocaleString("fr-FR")} €`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      ringColor: "ring-emerald-500/20",
    },
    {
      title: "Commissions ce mois",
      value: `${overview.commissionsThisMonth.toLocaleString("fr-FR")} €`,
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      ringColor: "ring-blue-500/20",
    },
    {
      title: "Abonnements actifs",
      value: overview.activeSubscriptions.toString(),
      icon: Package,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      ringColor: "ring-purple-500/20",
    },
    {
      title: "Prochain paiement",
      value: `${overview.nextPayout.toLocaleString("fr-FR")} €`,
      icon: CreditCard,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      ringColor: "ring-amber-500/20",
      subtitle: overview.nextPayoutDate
        ? new Date(overview.nextPayoutDate).toLocaleDateString("fr-FR")
        : "Aucun en attente",
    },
  ];

  function handleRequestPayout() {
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    startTransition(async () => {
      try {
        const result = await requestPayout(amount);
        toast.success(result.message);
        setPayoutAmount("");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur lors de la demande";
        toast.error(message);
      }
    });
  }

  const estimatedInstalls = parseInt(installCount) || 0;
  const estimatedEarnings = {
    installations: estimatedInstalls * 2,
    subscriptionsPro: Math.round(estimatedInstalls * 0.3) * 29 * 0.15,
    conversions: Math.round(estimatedInstalls * 0.3) * 5,
    total: 0,
  };
  estimatedEarnings.total =
    estimatedEarnings.installations +
    estimatedEarnings.subscriptionsPro +
    estimatedEarnings.conversions;

  return (
    <div>
      <PageHeader
        title="Monétisation"
        description="Suivez vos revenus, commissions et versements"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50 hover:shadow-md transition-all">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`h-9 w-9 rounded-lg ring-1 ${stat.ringColor} ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-muted/30 rounded-lg p-0.5">
          <TabsTrigger value="overview" className="data-[state=active]:bg-brand data-[state=active]:text-brand-dark data-[state=active]:shadow-sm">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="pricing" className="data-[state=active]:bg-brand data-[state=active]:text-brand-dark data-[state=active]:shadow-sm">Tarification</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-brand data-[state=active]:text-brand-dark data-[state=active]:shadow-sm">Historique</TabsTrigger>
          <TabsTrigger value="commissions" className="data-[state=active]:bg-brand data-[state=active]:text-brand-dark data-[state=active]:shadow-sm">Commissions</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenus mensuels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={overview.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} tickFormatter={(v: number) => `${v} €`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#14080e",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        color: "#fff",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: number) => [`${value.toLocaleString("fr-FR")} €`, "Revenu"]) as any}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#7af17a"
                      fill="#7af17a"
                      fillOpacity={0.15}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top extensions par revenu</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension</TableHead>
                    <TableHead className="text-right">Installations</TableHead>
                    <TableHead className="text-right">Revenu</TableHead>
                    <TableHead className="text-right">Croissance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.topExtensions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Aucune extension pour le moment
                      </TableCell>
                    </TableRow>
                  ) : (
                    overview.topExtensions.map((ext) => (
                      <TableRow key={ext.name}>
                        <TableCell className="font-medium">{ext.name}</TableCell>
                        <TableCell className="text-right">{ext.installs}</TableCell>
                        <TableCell className="text-right">
                          {ext.revenue.toLocaleString("fr-FR")} €
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              ext.growth >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {ext.growth >= 0 ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {Math.abs(ext.growth)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tarification */}
        <TabsContent value="pricing" className="space-y-6">
          {pricing.map((ext) => (
            <Card key={ext.id}>
              <CardHeader>
                <CardTitle className="text-lg">{ext.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{ext.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {ext.tiers.map((tier) => (
                    <div
                      key={tier.name}
                      className={`rounded-lg border p-4 ${
                        tier.name === "Pro"
                          ? "border-[#7af17a] bg-[#7af17a]/5"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{tier.name}</h4>
                        {tier.name === "Pro" && (
                          <Badge className="bg-[#7af17a] text-black text-xs">
                            Populaire
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-4">
                        {tier.price === 0 ? (
                          "Gratuit"
                        ) : (
                          <>
                            {tier.price} €<span className="text-sm font-normal text-muted-foreground">/mois</span>
                          </>
                        )}
                      </p>
                      <ul className="space-y-2">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm">
                            <Check className="h-3.5 w-3.5 text-[#7af17a] shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Historique */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Historique des versements</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Montant (€)"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  className="w-36"
                />
                <Button
                  onClick={handleRequestPayout}
                  disabled={isPending}
                  className="bg-[#7af17a] text-black hover:bg-[#7af17a]/80"
                >
                  {isPending ? "En cours..." : "Demander un versement"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Méthode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Aucun paiement enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          {new Date(payout.date).toLocaleDateString("fr-FR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {payout.amount.toLocaleString("fr-FR")} €
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              payout.status === "paye"
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            }
                          >
                            {payout.status === "paye" ? "Payé" : "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell>{payout.method}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions */}
        <TabsContent value="commissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Structure des commissions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Taux</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Exemple</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.type}>
                      <TableCell className="font-medium">{c.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {c.rate}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.description}</TableCell>
                      <TableCell className="text-sm">{c.example}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulateur de revenus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Nombre d&apos;installations estimées
                  </label>
                  <Input
                    type="number"
                    placeholder="Ex : 100"
                    value={installCount}
                    onChange={(e) => setInstallCount(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
                {estimatedInstalls > 0 && (
                  <div className="rounded-lg border border-border/50 p-4 space-y-3">
                    <h4 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Estimation des gains mensuels
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Commissions installations</p>
                        <p className="text-xl font-bold text-green-400">
                          {estimatedEarnings.installations.toLocaleString("fr-FR")} €
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {estimatedInstalls} x 2,00 €
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Abonnements Pro (30% conv.)</p>
                        <p className="text-xl font-bold text-blue-400">
                          {estimatedEarnings.subscriptionsPro.toLocaleString("fr-FR")} €
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(estimatedInstalls * 0.3)} abonnés x 15%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Bonus conversions</p>
                        <p className="text-xl font-bold text-purple-400">
                          {estimatedEarnings.conversions.toLocaleString("fr-FR")} €
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(estimatedInstalls * 0.3)} x 5,00 €
                        </p>
                      </div>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Total estimé / mois</p>
                        <p className="text-2xl font-bold text-[#7af17a]">
                          {estimatedEarnings.total.toLocaleString("fr-FR")} €
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
