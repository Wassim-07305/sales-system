"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FileText,
  GitBranch,
  Brain,
  Share2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface TopScript {
  id: string;
  title: string;
  type: "flowchart" | "mindmap";
  sharesCount: number;
  updatedAt: string;
  nodesCount: number;
}

interface AnalyticsData {
  totalScripts: number;
  totalFlowcharts: number;
  totalMindMaps: number;
  totalShared: number;
  totalPersonal: number;
  avgNodes: number;
  monthlyData: { month: string; flowcharts: number; mindmaps: number }[];
  topScripts: TopScript[];
  recentlyUpdated: TopScript[];
}

const CHART_GREEN = "#7af17a";
const CHART_SECONDARY = "#a1a1aa";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ScriptAnalyticsView({ data }: { data: AnalyticsData }) {
  const pieData = [
    { name: "Partages", value: data.totalShared },
    { name: "Personnels", value: data.totalPersonal },
  ];
  const PIE_COLORS = [CHART_SECONDARY, CHART_GREEN];

  return (
    <div>
      <PageHeader
        title="Analytiques Scripts"
        description="Performance et statistiques de vos scripts de vente"
      >
        <Link href="/scripts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux scripts
          </Button>
        </Link>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="rounded-2xl border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total scripts
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-brand" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalScripts}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Flowcharts
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center">
              <GitBranch className="h-4 w-4 text-brand" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalFlowcharts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{data.avgNodes} noeuds en moyenne
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mind Maps
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center">
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMindMaps}</div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Scripts partages
            </CardTitle>
            <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center">
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalShared}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalScripts > 0
                ? `${Math.round((data.totalShared / data.totalScripts) * 100)}% du total`
                : "0% du total"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Bar Chart - Scripts created per month */}
        <Card className="lg:col-span-2 rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Scripts crees par mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 12,
                      fill: "hsl(var(--muted-foreground))",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="flowcharts"
                    name="Flowcharts"
                    fill={CHART_GREEN}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="mindmaps"
                    name="Mind Maps"
                    fill={CHART_SECONDARY}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Shared vs Personal */}
        <Card className="rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Partages vs Personnels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              {data.totalScripts > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Aucun script pour le moment
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Scripts Table */}
      <Card className="rounded-2xl border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Top scripts</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topScripts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Noeuds</TableHead>
                  <TableHead className="text-center">Partages</TableHead>
                  <TableHead className="text-right">
                    Derniere mise a jour
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topScripts.map((script) => (
                  <TableRow key={script.id}>
                    <TableCell>
                      <Link
                        href={`/scripts/${script.type === "flowchart" ? "flowchart" : "mindmap"}/${script.id}`}
                        className="font-medium hover:underline"
                      >
                        {script.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          script.type === "flowchart"
                            ? "border-brand/30 text-brand"
                            : "border-muted-foreground/30 text-muted-foreground"
                        }
                      >
                        {script.type === "flowchart" ? (
                          <GitBranch className="h-3 w-3 mr-1" />
                        ) : (
                          <Brain className="h-3 w-3 mr-1" />
                        )}
                        {script.type === "flowchart" ? "Flowchart" : "Mind Map"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {script.nodesCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {script.sharesCount}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {formatDate(script.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                Aucun script disponible. Creez votre premier flowchart ou mind
                map.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
