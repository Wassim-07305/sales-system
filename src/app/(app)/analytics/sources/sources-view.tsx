"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface SourceData {
  name: string;
  deals: number;
  totalValue: number;
  signed: number;
  signedValue: number;
  conversionRate: number;
  color: string;
}

export function SourcesView({ data }: { data: SourceData[] }) {
  const pieData = data.map((s) => ({ name: s.name, value: s.deals, color: s.color }));
  const topSource = data[0];

  return (
    <div>
      <PageHeader title="Performance par Source" description="Analyse de la rentabilité par canal d'acquisition">
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Répartition des deals par source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={130}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Aucune donnée disponible
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détail par source</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-medium">Source</th>
                    <th className="text-right p-4 font-medium">Deals</th>
                    <th className="text-right p-4 font-medium">Valeur totale</th>
                    <th className="text-right p-4 font-medium">Conversion</th>
                    <th className="text-right p-4 font-medium">CA signé</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((source) => (
                    <tr key={source.name} className="border-b last:border-0">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />
                          <span className="font-medium">{source.name}</span>
                          {topSource && source.name === topSource.name && (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">Top</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">{source.deals}</td>
                      <td className="p-4 text-right">{source.totalValue.toLocaleString("fr-FR")} €</td>
                      <td className="p-4 text-right">{source.conversionRate.toFixed(1)}%</td>
                      <td className="p-4 text-right font-medium">{source.signedValue.toLocaleString("fr-FR")} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                Aucune source de deals trouvée.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
