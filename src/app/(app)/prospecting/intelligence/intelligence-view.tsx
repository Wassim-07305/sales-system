"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Radar,
  Building,
  TrendingUp,
  Target,
  Sparkles,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  Lightbulb,
  Crosshair,
  AlertTriangle,
  ArrowUpRight,
  Signal,
} from "lucide-react";
import {
  getHuntingRecommendations,
  analyzeCompetitor,
  addCompetitor,
  getMarketInsights,
} from "@/lib/actions/intelligence";

// ─── Types (local, NOT exported from server actions) ────────────────

interface Competitor {
  id: string;
  name: string;
  website: string;
  strengths: string;
  weaknesses: string;
  pricingTier: string;
  notes: string;
}

interface HuntingRecommendations {
  idealProfile: {
    description: string;
    characteristics: string[];
    sectors: string[];
    companySize: string;
    budget: string;
    decisionCriteria: string[];
  };
  huntingStrategies: {
    channel: string;
    approach: string;
    expectedConversion: string;
  }[];
  intentSignals: {
    signal: string;
    source: string;
    relevance: "forte" | "moyenne" | "faible";
  }[];
}

interface CompetitorAnalysis {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  positioning: string;
  pricingComparison: string;
  keyDifferentiators: string[];
  recommendation: string;
}

interface MarketInsights {
  overview: string;
  trends: {
    title: string;
    description: string;
    impact: "positif" | "neutre" | "negatif";
  }[];
  opportunities: {
    title: string;
    description: string;
    priority: "haute" | "moyenne" | "basse";
  }[];
  risks: { title: string; description: string }[];
}

interface Props {
  competitors: Competitor[];
}

// ─── Constants ──────────────────────────────────────────────────────

const RELEVANCE_COLORS: Record<string, string> = {
  forte: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  moyenne: "bg-muted/60 text-muted-foreground border-border/50",
  faible: "bg-muted/40 text-muted-foreground/60 border-border/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  haute: "bg-foreground/10 text-foreground border-foreground/20",
  moyenne: "bg-muted/60 text-muted-foreground border-border/50",
  basse: "bg-muted/40 text-muted-foreground/60 border-border/30",
};

const IMPACT_COLORS: Record<string, string> = {
  positif: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  neutre: "bg-muted/40 text-muted-foreground/60 border-border/30",
  negatif: "bg-foreground/10 text-foreground border-foreground/20",
};

// ─── Component ──────────────────────────────────────────────────────

export function IntelligenceView({ competitors: initialCompetitors }: Props) {
  const [isPending, startTransition] = useTransition();

  // Recommendations state
  const [recommendations, setRecommendations] =
    useState<HuntingRecommendations | null>(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Competitors state
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [analyses, setAnalyses] = useState<Record<string, CompetitorAnalysis>>(
    {},
  );
  const [expandedCompetitor, setExpandedCompetitor] = useState<string | null>(
    null,
  );
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({
    name: "",
    website: "",
    notes: "",
  });

  // Market insights state
  const [insights, setInsights] = useState<MarketInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // ─── Handlers ───────────────────────────────────────────────────

  function handleLoadRecommendations() {
    setLoadingRecommendations(true);
    startTransition(async () => {
      try {
        const data = await getHuntingRecommendations();
        setRecommendations(data);
        toast.success("Recommandations générées avec succès");
      } catch {
        toast.error("Erreur lors de la génération des recommandations");
      } finally {
        setLoadingRecommendations(false);
      }
    });
  }

  function handleAnalyzeCompetitor(competitor: Competitor) {
    setAnalyzingId(competitor.id);
    startTransition(async () => {
      try {
        const data = await analyzeCompetitor(competitor.name);
        setAnalyses((prev) => ({ ...prev, [competitor.id]: data }));
        setExpandedCompetitor(competitor.id);
        toast.success(`Analyse de ${competitor.name} terminée`);
      } catch {
        toast.error("Erreur lors de l'analyse concurrentielle");
      } finally {
        setAnalyzingId(null);
      }
    });
  }

  function handleAddCompetitor() {
    if (!newCompetitor.name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    startTransition(async () => {
      try {
        const result = await addCompetitor(newCompetitor);
        setCompetitors((prev) => [...prev, result]);
        setNewCompetitor({ name: "", website: "", notes: "" });
        setAddDialogOpen(false);
        toast.success("Concurrent ajouté avec succès");
      } catch {
        toast.error("Erreur lors de l'ajout du concurrent");
      }
    });
  }

  function handleLoadInsights() {
    setLoadingInsights(true);
    startTransition(async () => {
      try {
        const data = await getMarketInsights();
        setInsights(data);
        toast.success("Insights marché générés avec succès");
      } catch {
        toast.error("Erreur lors de la génération des insights");
      } finally {
        setLoadingInsights(false);
      }
    });
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hunting Intelligence"
        description="IA de prospection, veille concurrentielle et insights marché"
      >
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 gap-1">
          <Sparkles className="size-3 mr-1" />
          IA
        </Badge>
      </PageHeader>

      <Tabs defaultValue="recommandations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recommandations">
            <Target className="size-4 mr-1.5" />
            Recommandations
          </TabsTrigger>
          <TabsTrigger value="concurrence">
            <Building className="size-4 mr-1.5" />
            Veille Concurrentielle
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="size-4 mr-1.5" />
            Insights Marché
          </TabsTrigger>
        </TabsList>

        {/* ──────────────── TAB: Recommandations ──────────────── */}
        <TabsContent value="recommandations" className="space-y-6">
          {!recommendations ? (
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="rounded-2xl bg-emerald-500/10 p-4">
                  <Radar className="size-8 text-emerald-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">
                    Profil prospect idéal & stratégies de chasse
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    L&apos;IA analyse vos deals gagnés pour identifier le profil
                    idéal de prospect à cibler et les meilleures stratégies
                    d&apos;approche.
                  </p>
                </div>
                <Button
                  onClick={handleLoadRecommendations}
                  disabled={loadingRecommendations || isPending}
                  className="bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl font-medium"
                >
                  {loadingRecommendations ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="size-4 mr-2" />
                  )}
                  Générer les recommandations
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Ideal Profile */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Crosshair className="size-4 text-emerald-500" />
                    Profil prospect idéal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {recommendations.idealProfile.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Caractéristiques
                      </p>
                      <ul className="space-y-1">
                        {recommendations.idealProfile.characteristics.map(
                          (c, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-emerald-500 mt-0.5">•</span>
                              {c}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Secteurs cibles
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {recommendations.idealProfile.sectors.map((s, i) => (
                          <Badge key={i} variant="outline">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3">
                        Taille d&apos;entreprise
                      </p>
                      <p className="text-sm">
                        {recommendations.idealProfile.companySize}
                      </p>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-3">
                        Budget
                      </p>
                      <p className="text-sm">
                        {recommendations.idealProfile.budget}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Critères de décision
                      </p>
                      <ul className="space-y-1">
                        {recommendations.idealProfile.decisionCriteria.map(
                          (c, i) => (
                            <li
                              key={i}
                              className="text-sm flex items-start gap-2"
                            >
                              <span className="text-emerald-500 mt-0.5">•</span>
                              {c}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hunting Strategies */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="size-4 text-emerald-500" />
                    Stratégies de chasse
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {recommendations.huntingStrategies.map((strategy, i) => (
                      <Card key={i} className="bg-muted/50">
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="size-4 text-emerald-500" />
                            <p className="text-sm font-medium">
                              {strategy.channel}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {strategy.approach}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Conversion: {strategy.expectedConversion}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Intent Signals */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Signal className="size-4 text-emerald-500" />
                    Signaux d&apos;intention détectés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendations.intentSignals.map((signal, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Eye className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {signal.signal}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Source : {signal.source}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={RELEVANCE_COLORS[signal.relevance]}
                        >
                          {signal.relevance}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleLoadRecommendations}
                  disabled={loadingRecommendations || isPending}
                >
                  {loadingRecommendations ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4 mr-2" />
                  )}
                  Actualiser les recommandations
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ──────────────── TAB: Veille Concurrentielle ──────────────── */}
        <TabsContent value="concurrence" className="space-y-6">
          {/* Actions bar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {competitors.length} concurrent{competitors.length > 1 ? "s" : ""}{" "}
              suivis
            </p>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-xl font-medium">
                  <Plus className="size-4 mr-2" />
                  Ajouter un concurrent
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un concurrent</DialogTitle>
                  <DialogDescription>
                    Ajoutez un nouveau concurrent à suivre dans votre veille
                    concurrentielle.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="comp-name">Nom</Label>
                    <Input
                      id="comp-name"
                      placeholder="Ex: Salesforce"
                      value={newCompetitor.name}
                      onChange={(e) =>
                        setNewCompetitor((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-website">Site web</Label>
                    <Input
                      id="comp-website"
                      placeholder="https://..."
                      value={newCompetitor.website}
                      onChange={(e) =>
                        setNewCompetitor((prev) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comp-notes">Notes</Label>
                    <Input
                      id="comp-notes"
                      placeholder="Informations complémentaires..."
                      value={newCompetitor.notes}
                      onChange={(e) =>
                        setNewCompetitor((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button onClick={handleAddCompetitor} disabled={isPending}>
                    {isPending ? (
                      <Loader2 className="size-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="size-4 mr-2" />
                    )}
                    Ajouter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Competitor cards grid */}
          {competitors.length === 0 && (
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="py-12 text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Building className="h-7 w-7 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Aucun concurrent ajouté
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Cliquez sur &quot;Ajouter un concurrent&quot; pour commencer
                  votre veille concurrentielle.
                </p>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitors.map((comp) => (
              <Card
                key={comp.id}
                className="flex flex-col shadow-sm rounded-2xl"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building className="size-4 text-muted-foreground" />
                      {comp.name}
                    </CardTitle>
                    <a
                      href={comp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-emerald-500 mb-1">
                      Forces
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comp.strengths}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1">
                      Faiblesses
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {comp.weaknesses}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Tarification
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {comp.pricingTier}
                    </Badge>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleAnalyzeCompetitor(comp)}
                      disabled={analyzingId === comp.id || isPending}
                    >
                      {analyzingId === comp.id ? (
                        <Loader2 className="size-3 mr-1.5 animate-spin" />
                      ) : (
                        <Sparkles className="size-3 mr-1.5" />
                      )}
                      Analyser
                    </Button>
                    {analyses[comp.id] && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpandedCompetitor(
                            expandedCompetitor === comp.id ? null : comp.id,
                          )
                        }
                      >
                        {expandedCompetitor === comp.id ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>

                {/* Expanded SWOT analysis */}
                {expandedCompetitor === comp.id && analyses[comp.id] && (
                  <div className="border-t px-6 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                          <ShieldAlert className="size-3" /> Forces
                        </p>
                        {analyses[comp.id].swot.strengths.map((s, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {s}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                          <AlertTriangle className="size-3" /> Faiblesses
                        </p>
                        {analyses[comp.id].swot.weaknesses.map((w, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {w}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <Lightbulb className="size-3" /> Opportunités
                        </p>
                        {analyses[comp.id].swot.opportunities.map((o, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {o}
                          </p>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                          <AlertTriangle className="size-3" /> Menaces
                        </p>
                        {analyses[comp.id].swot.threats.map((t, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            • {t}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold">Positionnement</p>
                      <p className="text-xs text-muted-foreground">
                        {analyses[comp.id].positioning}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold">
                        Comparaison tarifaire
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analyses[comp.id].pricingComparison}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-emerald-500">
                        Nos différenciateurs
                      </p>
                      {analyses[comp.id].keyDifferentiators.map((d, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          • {d}
                        </p>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs font-semibold text-emerald-500 mb-1">
                        Recommandation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {analyses[comp.id].recommendation}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Comparison table */}
          <Card className="shadow-sm rounded-2xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Tableau comparatif</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concurrent</TableHead>
                    <TableHead>Forces</TableHead>
                    <TableHead>Faiblesses</TableHead>
                    <TableHead>Tarification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competitors.map((comp) => (
                    <TableRow
                      key={comp.id}
                      className="hover:bg-secondary/50 transition-colors"
                    >
                      <TableCell className="font-medium">{comp.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {comp.strengths}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                        {comp.weaknesses}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {comp.pricingTier}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────────────── TAB: Insights Marché ──────────────── */}
        <TabsContent value="insights" className="space-y-6">
          {!insights ? (
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="rounded-2xl bg-emerald-500/10 p-4">
                  <TrendingUp className="size-8 text-emerald-500" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Insights Marché</h3>
                  <p className="text-muted-foreground text-sm max-w-md">
                    L&apos;IA analyse vos données de deals pour identifier les
                    tendances du marché, les opportunités et les risques.
                  </p>
                </div>
                <Button
                  onClick={handleLoadInsights}
                  disabled={loadingInsights || isPending}
                  className="bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl font-medium"
                >
                  {loadingInsights ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="size-4 mr-2" />
                  )}
                  Générer les insights
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Market Overview */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Radar className="size-4 text-emerald-500" />
                    Vue d&apos;ensemble du marché
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {insights.overview}
                  </p>
                </CardContent>
              </Card>

              {/* Trends */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="size-4 text-emerald-500" />
                    Tendances identifiées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.trends.map((trend, i) => (
                      <div
                        key={i}
                        className="flex items-start justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{trend.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {trend.description}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`ml-3 shrink-0 ${IMPACT_COLORS[trend.impact]}`}
                        >
                          {trend.impact}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="size-4 text-emerald-500" />
                    Opportunités
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.opportunities.map((opp, i) => (
                      <Card key={i} className="bg-muted/50">
                        <CardContent className="pt-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{opp.title}</p>
                            <Badge
                              variant="outline"
                              className={PRIORITY_COLORS[opp.priority]}
                            >
                              {opp.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {opp.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risks */}
              <Card className="shadow-sm rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="size-4 text-muted-foreground" />
                    Risques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {insights.risks.map((risk, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-foreground/5 border border-foreground/10"
                      >
                        <p className="text-sm font-medium">{risk.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {risk.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={handleLoadInsights}
                  disabled={loadingInsights || isPending}
                >
                  {loadingInsights ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4 mr-2" />
                  )}
                  Actualiser l&apos;analyse
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
