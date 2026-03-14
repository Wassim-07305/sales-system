"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  BarChart3,
  Brain,
  MessageSquare,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Target,
  AlertTriangle,
  Lightbulb,
  Users,
  Clock,
  Hash,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { submitTranscript } from "@/lib/actions/call-review";
import type { CallReview, CallReviewStats, CallReviewAIAnalysis } from "@/lib/call-review-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-amber-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 6) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (score >= 4) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function sentimentBadge(sentiment: string) {
  switch (sentiment) {
    case "positif":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Positif</Badge>;
    case "négatif":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Négatif</Badge>;
    case "mixte":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Mixte</Badge>;
    default:
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Neutre</Badge>;
  }
}

function sentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positif":
      return "#7af17a";
    case "négatif":
      return "#ef4444";
    default:
      return "#f59e0b";
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBreakdownCard({ breakdown }: { breakdown: CallReviewAIAnalysis["scoreBreakdown"] }) {
  const items = [
    { label: "Ouverture", value: breakdown.ouverture },
    { label: "Découverte", value: breakdown.decouverte },
    { label: "Argumentation", value: breakdown.argumentation },
    { label: "Closing", value: breakdown.closing },
  ];

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <Target className="h-4 w-4 text-[#7af17a]" />
        Score détaillé
      </h4>
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className={scoreColor(item.value)}>{item.value}/10</span>
          </div>
          <Progress value={item.value * 10} className="h-2" />
        </div>
      ))}
    </div>
  );
}

function TalkRatioBar({ ratio }: { ratio: { vendeur: number; prospect: number } }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <Users className="h-4 w-4 text-[#7af17a]" />
        Ratio de parole
      </h4>
      <div className="flex rounded-full overflow-hidden h-6">
        <div
          className="bg-blue-500 flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${ratio.vendeur}%` }}
        >
          {ratio.vendeur}%
        </div>
        <div
          className="bg-amber-500 flex items-center justify-center text-xs text-white font-medium"
          style={{ width: `${ratio.prospect}%` }}
        >
          {ratio.prospect}%
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Vendeur</span>
        <span>Prospect</span>
      </div>
    </div>
  );
}

function SentimentTimeline({
  timeline,
}: {
  timeline: CallReviewAIAnalysis["sentimentTimeline"];
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[#7af17a]" />
        Évolution du sentiment
      </h4>
      <div className="flex items-end gap-1 h-16">
        {timeline.map((point, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-sm"
              style={{
                height:
                  point.sentiment === "positif"
                    ? "100%"
                    : point.sentiment === "neutre"
                    ? "60%"
                    : "30%",
                backgroundColor: sentimentColor(point.sentiment),
                opacity: 0.7,
              }}
            />
            <span className="text-[10px] text-muted-foreground">{point.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewDetail({ review }: { review: CallReview }) {
  const analysis = review.aiAnalysis;
  if (!analysis) return null;

  return (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* Transcript */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#7af17a]" />
          Transcript
        </h4>
        <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {review.transcript.split("\n").map((line, i) => {
            const isVendeur = line.startsWith("Vendeur:");
            const isProspect = line.startsWith("Prospect:");
            return (
              <div key={i} className={`mb-2 ${isVendeur ? "text-blue-400" : isProspect ? "text-amber-400" : ""}`}>
                {review.keywords.reduce(
                  (acc, keyword) => {
                    if (typeof acc === "string" && acc.toLowerCase().includes(keyword.toLowerCase())) {
                      const parts = acc.split(new RegExp(`(${keyword})`, "gi"));
                      return (
                        <>
                          {parts.map((part, j) =>
                            part.toLowerCase() === keyword.toLowerCase() ? (
                              <span key={j} className="bg-[#7af17a]/20 text-[#7af17a] px-0.5 rounded font-medium">
                                {part}
                              </span>
                            ) : (
                              part
                            )
                          )}
                        </>
                      );
                    }
                    return acc;
                  },
                  line as React.ReactNode
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score breakdown */}
        <ScoreBreakdownCard breakdown={analysis.scoreBreakdown} />

        {/* Sentiment timeline */}
        <SentimentTimeline timeline={analysis.sentimentTimeline} />

        {/* Talk ratio */}
        <TalkRatioBar ratio={analysis.talkRatio} />

        {/* Keywords */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Hash className="h-4 w-4 text-[#7af17a]" />
            Mots-clés
          </h4>
          <div className="flex flex-wrap gap-2">
            {review.keywords.map((kw) => (
              <Badge key={kw} variant="outline" className="border-[#7af17a]/30 text-[#7af17a]">
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Objections */}
      {analysis.objections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Objections détectées
          </h4>
          <ul className="space-y-1">
            {analysis.objections.map((obj, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                {obj}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key moments */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#7af17a]" />
          Moments clés
        </h4>
        <ul className="space-y-1">
          {analysis.keyMoments.map((moment, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-[#7af17a] mt-1">•</span>
              {moment}
            </li>
          ))}
        </ul>
      </div>

      {/* Strengths & improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Points forts
          </h4>
          <ul className="space-y-1">
            {review.strengths.map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-400 mt-1">+</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Axes d&apos;amélioration
          </h4>
          <ul className="space-y-1">
            {review.improvements.map((imp, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 mt-1">-</span>
                {imp}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Brain className="h-4 w-4 text-[#7af17a]" />
          Recommandations IA
        </h4>
        <ul className="space-y-1">
          {analysis.recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-[#7af17a] mt-1">{i + 1}.</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function ReviewsView({
  reviews,
  stats,
}: {
  reviews: CallReview[];
  stats: CallReviewStats;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [isPending, startTransition] = useTransition();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("analyses");

  const handleAnalyze = () => {
    if (!transcript.trim()) {
      toast.error("Veuillez coller un transcript avant d'analyser.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitTranscript(`call-${Date.now()}`, transcript);
        setAnalysisResult(result);
        toast.success("Analyse terminée avec succès !");
      } catch {
        toast.error("Erreur lors de l'analyse. Veuillez réessayer.");
      }
    });
  };

  const trendValue =
    stats.scoreOverTime.length >= 2
      ? stats.scoreOverTime[stats.scoreOverTime.length - 1].score -
        stats.scoreOverTime[stats.scoreOverTime.length - 2].score
      : 0;

  return (
    <>
      <PageHeader
        title="Analyse d'appels"
        description="Analysez vos appels commerciaux avec l'IA pour améliorer vos performances"
      />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Appels analysés</p>
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-[#7af17a]/10 ring-1 ring-[#7af17a]/20 flex items-center justify-center">
                <Mic className="h-5 w-5 text-[#7af17a]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score moyen</p>
                <p className={`text-2xl font-bold ${scoreColor(stats.averageScore)}`}>
                  {stats.averageScore}/10
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mot-clé fréquent</p>
                <p className="text-2xl font-bold text-[#7af17a]">
                  {stats.commonKeywords[0]?.keyword || "-"}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 ring-1 ring-purple-500/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tendance</p>
                <p className={`text-2xl font-bold ${trendValue >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {trendValue >= 0 ? "+" : ""}
                  {trendValue.toFixed(1)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="analyses">Analyses</TabsTrigger>
          <TabsTrigger value="nouveau">Nouveau transcript</TabsTrigger>
          <TabsTrigger value="statistiques">Statistiques</TabsTrigger>
        </TabsList>

        {/* Analyses tab */}
        <TabsContent value="analyses" className="space-y-4">
          {reviews.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Mic className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-sm">Aucun appel analysé pour le moment</p>
                <p className="text-xs mt-1">
                  Collez un transcript dans l&apos;onglet &quot;Nouveau transcript&quot; pour commencer.
                </p>
              </CardContent>
            </Card>
          ) : (
            reviews.map((review) => {
              const isExpanded = expandedId === review.id;
              return (
                <Card key={review.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <button
                      className="w-full text-left"
                      onClick={() => setExpandedId(isExpanded ? null : review.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold ${scoreBg(review.score)}`}
                          >
                            {review.score}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-white">
                                {review.prospectName}
                              </h3>
                              {sentimentBadge(review.sentiment)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {review.duration} min
                              </span>
                              <span>
                                {new Date(review.createdAt).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden sm:flex gap-1.5">
                            {review.keywords.slice(0, 3).map((kw) => (
                              <Badge
                                key={kw}
                                variant="outline"
                                className="text-xs border-border"
                              >
                                {kw}
                              </Badge>
                            ))}
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>

                    {isExpanded && <ReviewDetail review={review} />}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Nouveau transcript tab */}
        <TabsContent value="nouveau" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#7af17a]" />
                Coller un transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={`Collez votre transcript d'appel ici...\n\nFormat recommandé :\nVendeur: Bonjour, comment allez-vous ?\nProspect: Très bien, merci...`}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="min-h-[250px] font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {transcript.length > 0
                    ? `${transcript.split("\n").length} lignes`
                    : "En attente d'un transcript..."}
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={isPending || !transcript.trim()}
                  className="bg-[#7af17a] text-black hover:bg-[#7af17a]/80"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Analyser avec l&apos;IA
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Inline results */}
          {analysisResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#7af17a]" />
                  Résultats de l&apos;analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Score */}
                <div className="flex items-center gap-4">
                  <div
                    className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${scoreBg(analysisResult.score)}`}
                  >
                    {analysisResult.score}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">
                      Score global : {analysisResult.score}/10
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sentiment : {analysisResult.sentiment}
                      {analysisResult.prospectName &&
                        ` | Prospect : ${analysisResult.prospectName}`}
                    </p>
                  </div>
                </div>

                {/* Score breakdown */}
                {analysisResult.aiAnalysis?.scoreBreakdown && (
                  <ScoreBreakdownCard breakdown={analysisResult.aiAnalysis.scoreBreakdown} />
                )}

                {/* Talk ratio */}
                {analysisResult.aiAnalysis?.talkRatio && (
                  <TalkRatioBar ratio={analysisResult.aiAnalysis.talkRatio} />
                )}

                {/* Keywords */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-white">Mots-clés</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.keywords?.map((kw: string) => (
                      <Badge
                        key={kw}
                        variant="outline"
                        className="border-[#7af17a]/30 text-[#7af17a]"
                      >
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Objections */}
                {analysisResult.aiAnalysis?.objections?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Objections
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.aiAnalysis.objections.map((obj: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-amber-400 mt-1">•</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths & improvements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-green-400">Points forts</h4>
                    <ul className="space-y-1">
                      {analysisResult.strengths?.map((s: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-green-400 mt-1">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-amber-400">
                      Axes d&apos;amélioration
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.improvements?.map((imp: string, i: number) => (
                        <li
                          key={i}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-amber-400 mt-1">-</span>
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                {analysisResult.aiAnalysis?.recommendations?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Brain className="h-4 w-4 text-[#7af17a]" />
                      Recommandations IA
                    </h4>
                    <ul className="space-y-1">
                      {analysisResult.aiAnalysis.recommendations.map(
                        (rec: string, i: number) => (
                          <li
                            key={i}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-[#7af17a] mt-1">{i + 1}.</span>
                            {rec}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Statistiques tab */}
        <TabsContent value="statistiques" className="space-y-6">
          {/* Score over time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#7af17a]" />
                Évolution des scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.scoreOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} />
                    <YAxis domain={[0, 10]} stroke="#888" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={((value: number) => [`${value}/10`, "Score"]) as any}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#7af17a"
                      strokeWidth={2}
                      dot={{ fill: "#7af17a", r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Keywords bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-purple-400" />
                  Mots-clés fréquents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.commonKeywords.slice(0, 8)}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis type="number" stroke="#888" fontSize={12} />
                      <YAxis
                        dataKey="keyword"
                        type="category"
                        stroke="#888"
                        fontSize={11}
                        width={100}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#14080e",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((value: number) => [value, "Occurrences"]) as any}
                      />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Score distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                  Distribution des scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.scoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="range" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#14080e",
                          border: "1px solid #333",
                          borderRadius: "8px",
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={((value: number) => [value, "Appels"]) as any}
                      />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top improvement areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-400" />
                Axes d&apos;amélioration prioritaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.improvementTrends.map((trend, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">{trend.area}</span>
                      <span className="text-muted-foreground">
                        {trend.count} mention{trend.count > 1 ? "s" : ""}
                      </span>
                    </div>
                    <Progress
                      value={
                        (trend.count / (stats.improvementTrends[0]?.count || 1)) * 100
                      }
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
