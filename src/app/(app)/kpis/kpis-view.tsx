"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Target, TrendingUp, Calendar, Calculator } from "lucide-react";
import { submitNpsScore } from "@/lib/actions/nps";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { RevenueSimulator } from "@/components/revenue-simulator";
import type { SimulatorInputs } from "@/lib/actions/simulator";

interface Kpi {
  id: string;
  date: string;
  bookings_count: number;
  show_up_rate: number;
  closing_rate: number;
  revenue_signed: number;
}

interface NpsSurvey {
  id: string;
  trigger_day: number;
  sent_at: string;
}

export function KpisView({
  kpis,
  pendingNps,
  savedSimulatorInputs,
}: {
  kpis: Kpi[];
  pendingNps: NpsSurvey | null;
  savedSimulatorInputs?: SimulatorInputs | null;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<"30" | "60" | "90">("30");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [npsComment, setNpsComment] = useState("");
  const [npsSubmitting, setNpsSubmitting] = useState(false);
  const [npsShown, setNpsShown] = useState(!!pendingNps);

  // Filter KPIs by period
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(period));
  const filteredKpis = kpis.filter((k) => new Date(k.date) >= cutoff);

  // Compute stats
  const totalBookings = filteredKpis.reduce((sum, k) => sum + k.bookings_count, 0);
  const avgShowUp = filteredKpis.length > 0
    ? Math.round(filteredKpis.reduce((sum, k) => sum + Number(k.show_up_rate), 0) / filteredKpis.length)
    : 0;
  const avgClosing = filteredKpis.length > 0
    ? Math.round(filteredKpis.reduce((sum, k) => sum + Number(k.closing_rate), 0) / filteredKpis.length)
    : 0;
  const totalRevenue = filteredKpis.reduce((sum, k) => sum + Number(k.revenue_signed), 0);

  const chartData = filteredKpis.map((k) => ({
    date: new Date(k.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    bookings: k.bookings_count,
    showUp: Number(k.show_up_rate),
    closing: Number(k.closing_rate),
    revenue: Number(k.revenue_signed),
  }));

  const stats = [
    { title: `Appels bookés (${period}j)`, value: String(totalBookings), icon: Phone },
    { title: "Taux show-up", value: `${avgShowUp}%`, icon: Calendar },
    { title: "Taux closing", value: `${avgClosing}%`, icon: Target },
    { title: `CA signé (${period}j)`, value: `${totalRevenue.toLocaleString("fr-FR")} €`, icon: TrendingUp },
  ];

  async function handleNpsSubmit() {
    if (npsScore === null || !pendingNps) return;
    setNpsSubmitting(true);
    try {
      await submitNpsScore(pendingNps.id, npsScore, npsComment);
      toast.success("Merci pour votre avis !");
      setNpsShown(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setNpsSubmitting(false);
    }
  }

  const [activeTab, setActiveTab] = useState<"kpis" | "simulator">("kpis");

  return (
    <div>
      <PageHeader
        title="Mes KPIs"
        description="Suivez vos métriques de performance"
      />

      {/* Main tabs: KPIs vs Simulator */}
      <div className="flex gap-2 mb-6">
        <Button
          size="sm"
          variant={activeTab === "kpis" ? "default" : "outline"}
          className={activeTab === "kpis" ? "bg-brand text-brand-dark" : ""}
          onClick={() => setActiveTab("kpis")}
        >
          <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
          Mes KPIs
        </Button>
        <Button
          size="sm"
          variant={activeTab === "simulator" ? "default" : "outline"}
          className={activeTab === "simulator" ? "bg-brand text-brand-dark" : ""}
          onClick={() => setActiveTab("simulator")}
        >
          <Calculator className="h-3.5 w-3.5 mr-1.5" />
          Simulateur revenus
        </Button>
      </div>

      {activeTab === "simulator" && (
        <RevenueSimulator savedInputs={savedSimulatorInputs} />
      )}

      {activeTab === "kpis" && (<>


      {/* NPS Modal */}
      {npsShown && pendingNps && (
        <Card className="mb-6 border-brand/30 bg-brand/5">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Comment évaluez-vous votre expérience Sales System ?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Jour {pendingNps.trigger_day} — Donnez une note de 0 à 10
            </p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setNpsScore(i)}
                  className={`h-10 w-10 rounded-lg border text-sm font-semibold transition-all ${
                    npsScore === i
                      ? "bg-brand text-brand-dark border-brand"
                      : "hover:border-brand/50"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-4">
              <span>Pas du tout satisfait</span>
              <span>Très satisfait</span>
            </div>
            <Textarea
              placeholder="Un commentaire ? (optionnel)"
              value={npsComment}
              onChange={(e) => setNpsComment(e.target.value)}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                className="bg-brand text-brand-dark hover:bg-brand/90"
                onClick={handleNpsSubmit}
                disabled={npsScore === null || npsSubmitting}
              >
                Envoyer mon avis
              </Button>
              <Button variant="ghost" onClick={() => setNpsShown(false)}>
                Plus tard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Period toggle */}
      <div className="flex gap-2 mb-6">
        {(["30", "60", "90"] as const).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? "default" : "outline"}
            className={period === p ? "bg-brand text-brand-dark" : ""}
            onClick={() => setPeriod(p)}
          >
            {p} jours
          </Button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground">{stat.title}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {chartData.length > 0 ? (
        <Tabs defaultValue="bookings">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="revenue">Revenus</TabsTrigger>
            <TabsTrigger value="rates">Taux</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Appels bookés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="#7af17a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Évolution du CA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString("fr-FR")} €`, "CA"]} />
                      <Line type="monotone" dataKey="revenue" stroke="#7af17a" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>Taux show-up et closing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value}%`]} />
                      <Line type="monotone" dataKey="showUp" stroke="#3b82f6" strokeWidth={2} name="Show-up" />
                      <Line type="monotone" dataKey="closing" stroke="#7af17a" strokeWidth={2} name="Closing" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Pas encore de données</p>
            <p className="text-sm">Vos KPIs apparaîtront ici au fur et à mesure de votre activité.</p>
          </CardContent>
        </Card>
      )}
      </>)}
    </div>
  );
}
