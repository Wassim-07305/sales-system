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
        description="Suivez vos metriques de performance"
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
        <Card className="mb-6 border-brand/20 bg-gradient-to-br from-brand/10 via-brand/5 to-transparent overflow-hidden relative">
          <CardContent className="p-6 relative z-10">
            <h3 className="text-lg font-semibold mb-2">Comment évaluez-vous votre expérience Sales System ?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Jour {pendingNps.trigger_day} — Donnez une note de 0 à 10
            </p>
            <div className="flex gap-2 mb-4 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setNpsScore(i)}
                  className={`h-10 w-10 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                    npsScore === i
                      ? "bg-brand text-brand-dark border-brand shadow-sm shadow-brand/20"
                      : "hover:border-brand/50 hover:bg-brand/5"
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
            <Card key={stat.title} className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <CardContent className="p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{stat.title}</p>
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
            <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Appels bookés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="bookings" fill="#7af17a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Évolution du CA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
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
            <Card className="border-border/50 hover:shadow-md transition-all overflow-hidden">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Taux show-up et closing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
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
        <Card className="border-border/50">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-7 w-7 text-brand" />
            </div>
            <p className="font-semibold text-lg">Pas encore de donnees</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">Vos KPIs apparaitront ici au fur et a mesure de votre activite.</p>
          </CardContent>
        </Card>
      )}
      </>)}
    </div>
  );
}
