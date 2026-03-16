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
  Users,
  UserMinus,
  TrendingDown,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import type { RetentionData } from "@/lib/actions/retention";

interface Props {
  data: RetentionData;
}

export function RetentionView({ data }: Props) {
  const totalClients = data.activeClients + data.inactiveClients;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rétention & Churn"
        description="Suivi de la rétention clients et détection des risques de churn"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.activeClients}</p>
                <p className="text-xs text-muted-foreground">
                  Clients actifs (30j)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <UserMinus className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.inactiveClients}</p>
                <p className="text-xs text-muted-foreground">
                  Clients inactifs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.churnRate}%</p>
                <p className="text-xs text-muted-foreground">Taux de churn</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.atRiskClients.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Clients à risque
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active vs Inactive */}
        <Card className="shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Répartition clients</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={[
                  {
                    name: "Actifs",
                    value: data.activeClients,
                    fill: "#7af17a",
                  },
                  {
                    name: "Inactifs",
                    value: data.inactiveClients,
                    fill: "#ef4444",
                  },
                ]}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">
              {totalClients} clients au total
            </p>
          </CardContent>
        </Card>

        {/* Cohort Retention Curve */}
        <Card className="shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">
              Rétention par cohorte d&apos;inscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.cohortRetention.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.cohortRetention}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Rétention"]}
                    labelFormatter={(label) => `Cohorte ${String(label)}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#7af17a"
                    strokeWidth={2}
                    dot={{ fill: "#7af17a", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">
                Pas assez de données pour afficher la courbe de rétention
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Clients Table */}
      <Card className="shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Clients à risque (inactifs 5+ jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.atRiskClients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Inactif depuis</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.atRiskClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {client.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.email || ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          client.role === "client_b2b"
                            ? "bg-foreground/10 text-foreground border-foreground/20"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {client.role === "client_b2b" ? "B2B" : "B2C"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          client.daysSinceActive >= 10
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        }
                      >
                        {client.daysSinceActive} jours
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl h-8 text-xs"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Relancer
                        </Button>
                        <Link href="/bookings">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-xl h-8 text-xs"
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Appel
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun client à risque détecté</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
