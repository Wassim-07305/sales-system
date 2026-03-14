"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { CashFlowData } from "@/lib/actions/cash-flow";

const statusLabels: Record<string, string> = {
  pending: "En attente",
  paid: "Paye",
  overdue: "En retard",
  failed: "Echoue",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  failed: "bg-red-500/10 text-red-600 border-red-500/20",
};

const PIE_COLORS = ["#7af17a", "#60a5fa", "#ef4444"];

export function CashFlowView({ data }: { data: CashFlowData }) {
  const {
    receivedThisMonth,
    expectedThisMonth,
    overdueTotal,
    recognizedTotal,
    chartData,
    upcomingPayments,
    revenueBreakdown,
  } = data;

  const pieData = [
    { name: "Encaisse", value: revenueBreakdown.received },
    { name: "En attente", value: revenueBreakdown.pending },
    { name: "En retard", value: revenueBreakdown.overdue },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Cash Flow & Reconnaissance de Revenu"
        description="Suivi des encaissements, previsions et reconnaissance de revenu"
      >
        <Link href="/contracts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {receivedThisMonth.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Revenu encaisse (ce mois)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {expectedThisMonth.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              A recevoir (ce mois)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {overdueTotal.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">Impayes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold">
              {recognizedTotal.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Revenu total reconnu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Area Chart - Cash Flow Timeline */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Flux de tresorerie — 6 derniers mois + 3 mois a venir</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient
                    id="colorReceived"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#7af17a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7af17a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="colorExpected"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                  }
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  formatter={((value: number, name: string) => {
                    const labels: Record<string, string> = {
                      received: "Encaisse",
                      expected: "Attendu",
                    };
                    return [
                      `${Number(value || 0).toLocaleString("fr-FR")} \u20ac`,
                      labels[name] || name,
                    ];
                  }) as never}
                />
                <Legend
                  formatter={(value: string) => {
                    const labels: Record<string, string> = {
                      received: "Encaisse",
                      expected: "Attendu",
                    };
                    return labels[value] || value;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#7af17a"
                  strokeWidth={2.5}
                  fill="url(#colorReceived)"
                  connectNulls={false}
                  name="received"
                  dot={{ fill: "#7af17a", r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="expected"
                  stroke="#60a5fa"
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  fill="url(#colorExpected)"
                  connectNulls={false}
                  name="expected"
                  dot={{ fill: "#60a5fa", r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Upcoming Payments Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Paiements a venir</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingPayments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="h-7 w-7 opacity-50" />
                  </div>
                  <p className="font-medium">Aucun paiement a venir</p>
                  <p className="text-sm">
                    Les echeances de paiement apparaitront ici.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contrat</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Echeance</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Link
                              href={`/contracts/${payment.contract_id}`}
                              className="hover:underline font-medium"
                            >
                              {payment.contract_ref}
                            </Link>
                          </TableCell>
                          <TableCell>{payment.client_name}</TableCell>
                          <TableCell className="text-right font-medium">
                            {payment.amount.toLocaleString("fr-FR")} &euro;
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(payment.due_date), "d MMM yyyy", {
                              locale: fr,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                statusColors[payment.status] || ""
                              }
                            >
                              {statusLabels[payment.status] || payment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Recognition Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Reconnaissance de revenu</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Aucune donnee disponible</p>
              </div>
            ) : (
              <>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                        formatter={((value: number) => [
                          `${Number(value).toLocaleString("fr-FR")} \u20ac`,
                        ]) as never}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {pieData.map((entry, index) => (
                    <div
                      key={entry.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor:
                              PIE_COLORS[index % PIE_COLORS.length],
                          }}
                        />
                        <span>{entry.name}</span>
                      </div>
                      <span className="font-medium">
                        {entry.value.toLocaleString("fr-FR")} &euro;
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
