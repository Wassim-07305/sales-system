"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const revenueData = [
  { month: "Sep", value: 12000 },
  { month: "Oct", value: 18500 },
  { month: "Nov", value: 15200 },
  { month: "Déc", value: 22000 },
  { month: "Jan", value: 19800 },
  { month: "Fév", value: 24500 },
];

const funnelData = [
  { stage: "Prospects", value: 250 },
  { stage: "Contactés", value: 180 },
  { stage: "Appels", value: 87 },
  { stage: "Propositions", value: 42 },
  { stage: "Closing", value: 28 },
  { stage: "Signés", value: 18 },
];

const sourceData = [
  { name: "LinkedIn", value: 45, color: "#0077b5" },
  { name: "Instagram", value: 25, color: "#e4405f" },
  { name: "Referral", value: 20, color: "#7af17a" },
  { name: "Contenu", value: 10, color: "#f59e0b" },
];

const bigStats = [
  {
    title: "CA du mois",
    value: "24 500 €",
    change: "+12.5%",
    icon: DollarSign,
  },
  {
    title: "Clients actifs",
    value: "48",
    change: "+3",
    icon: Users,
  },
  {
    title: "Taux conversion",
    value: "7.2%",
    change: "+0.8%",
    icon: TrendingUp,
  },
  {
    title: "Pipeline",
    value: "89 200 €",
    change: "+8.2%",
    icon: BarChart3,
  },
];

export default function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Tableaux de bord et métriques de performance"
      />

      {/* Big numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {bigStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <ArrowUpRight className="h-3 w-3" />
                    {stat.change}
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="revenue">
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenus</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Évolution du CA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} €`, "CA"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#7af17a"
                      strokeWidth={3}
                      dot={{ fill: "#7af17a", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle>Funnel de conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" />
                    <YAxis dataKey="stage" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7af17a" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader>
              <CardTitle>Répartition par source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
