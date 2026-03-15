"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Users, TrendingUp, Calendar } from "lucide-react";

interface CohortData {
  cohort: string;
  created: number;
  signed: number;
  signedValue: number;
  conversionRate: number;
  avgCycleDays: number;
}

function conversionColor(rate: number): string {
  if (rate > 30) return "bg-green-500/15 text-green-600 font-semibold";
  if (rate >= 10) return "bg-orange-500/15 text-orange-600 font-semibold";
  return "bg-red-500/15 text-red-600 font-semibold";
}

function formatMonth(cohort: string): string {
  const [year, month] = cohort.split("-");
  const months = [
    "Janvier",
    "Fevrier",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Aout",
    "Septembre",
    "Octobre",
    "Novembre",
    "Decembre",
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

export function CohortView({ data }: { data: CohortData[] }) {
  const totalCreated = data.reduce((s, c) => s + c.created, 0);
  const totalSigned = data.reduce((s, c) => s + c.signed, 0);
  const totalValue = data.reduce((s, c) => s + c.signedValue, 0);
  const avgConversion =
    totalCreated > 0 ? Math.round((totalSigned / totalCreated) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Analyse par Cohortes"
        description="Performance des deals regroupes par mois de creation"
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
        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Users className="h-4 w-4 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{totalCreated}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Total Deals</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{totalSigned}</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Deals Signes</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {totalValue.toLocaleString("fr-FR")} &euro;
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">CA Total</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Calendar className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{avgConversion}%</p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">Taux Moyen</p>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Table */}
      <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Cohortes par mois</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucune donnee de cohorte</p>
              <p className="text-sm mt-1">
                Les cohortes apparaitront une fois les deals crees.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohorte</TableHead>
                  <TableHead className="text-right">Deals Crees</TableHead>
                  <TableHead className="text-right">Deals Signes</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                  <TableHead className="text-right">Taux Conversion</TableHead>
                  <TableHead className="text-right">Cycle Moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((cohort) => (
                  <TableRow key={cohort.cohort}>
                    <TableCell className="font-medium">
                      {formatMonth(cohort.cohort)}
                    </TableCell>
                    <TableCell className="text-right">
                      {cohort.created}
                    </TableCell>
                    <TableCell className="text-right">
                      {cohort.signed}
                    </TableCell>
                    <TableCell className="text-right">
                      {cohort.signedValue.toLocaleString("fr-FR")} &euro;
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-1 text-xs ${conversionColor(cohort.conversionRate)}`}
                      >
                        {cohort.conversionRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {cohort.avgCycleDays > 0
                        ? `${cohort.avgCycleDays} j`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
