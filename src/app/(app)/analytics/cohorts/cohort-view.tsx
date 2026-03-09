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
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
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
        description="Performance des deals regroupés par mois de création"
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
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Total Deals</span>
            </div>
            <p className="text-2xl font-bold">{totalCreated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">Deals Signés</span>
            </div>
            <p className="text-2xl font-bold">{totalSigned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-sm">CA Total</span>
            </div>
            <p className="text-2xl font-bold">
              {totalValue.toLocaleString("fr-FR")} &euro;
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Taux Moyen</span>
            </div>
            <p className="text-2xl font-bold">{avgConversion}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Cohort Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cohortes par mois</CardTitle>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Aucune donnée de cohorte</p>
              <p className="text-sm mt-1">
                Les cohortes apparaîtront une fois les deals créés.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cohorte</TableHead>
                  <TableHead className="text-right">Deals Créés</TableHead>
                  <TableHead className="text-right">Deals Signés</TableHead>
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
