"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Brain,
  Timer,
  Target,
  Trophy,
  CheckCircle,
  ScrollText,
} from "lucide-react";

interface ScriptNode {
  id: string;
  type?: string;
  data?: { label?: string; type?: string };
  position?: { x: number; y: number };
}

interface Script {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  nodes: ScriptNode[];
  edges: unknown[];
  created_at: string;
  updated_at: string;
}

interface TrainingResult {
  id: string;
  script_id: string;
  score: number;
  duration: number;
  missed_nodes: string[];
  feedback: string;
  created_at: string;
  script_flowcharts: { id: string; title: string } | null;
}

function getDifficulty(nodeCount: number): {
  label: string;
  color: string;
} {
  if (nodeCount <= 3) return { label: "Facile", color: "bg-brand/20 text-brand" };
  if (nodeCount <= 6) return { label: "Moyen", color: "bg-muted-foreground/20 text-muted-foreground" };
  return { label: "Difficile", color: "bg-foreground/20 text-foreground" };
}

export function TrainingView({
  scripts,
  history,
}: {
  scripts: Script[];
  history: TrainingResult[];
}) {
  // Compute stats
  const totalSessions = history.length;
  const avgScore =
    totalSessions > 0
      ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / totalSessions)
      : 0;
  const bestScore =
    totalSessions > 0 ? Math.max(...history.map((h) => h.score)) : 0;

  // Best score per script for display
  const bestByScript = new Map<string, number>();
  history.forEach((h) => {
    const current = bestByScript.get(h.script_id) || 0;
    if (h.score > current) bestByScript.set(h.script_id, h.score);
  });

  // Filter scripts that have enough nodes for training (at least 2)
  const trainableScripts = scripts.filter(
    (s) => Array.isArray(s.nodes) && s.nodes.length >= 2
  );

  return (
    <div>
      <PageHeader
        title="Entraînement Scripts"
        description="Entraînez-vous sur vos scripts de vente en mode simulation"
      >
        <Link href="/scripts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Scripts
          </Button>
        </Link>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#7af17a]/10">
                <Target className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sessions complétées</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/60">
                <Brain className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Score moyen</p>
                <p className="text-2xl font-bold">{avgScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted/60">
                <Trophy className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Meilleur score</p>
                <p className="text-2xl font-bold">{bestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scripts Grid */}
      <h2 className="text-lg font-semibold mb-4">Scripts disponibles</h2>
      {trainableScripts.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Aucun script disponible pour l&apos;entraînement.
            </p>
            <p className="text-muted-foreground text-sm mt-1">
              Créez un flowchart avec au moins 2 noeuds pour commencer.
            </p>
            <Link href="/scripts">
              <Button className="mt-4 bg-[#7af17a] text-black hover:bg-[#7af17a]/90">
                Créer un script
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trainableScripts.map((script) => {
            const nodeCount = Array.isArray(script.nodes) ? script.nodes.length : 0;
            const difficulty = getDifficulty(nodeCount);
            const best = bestByScript.get(script.id);

            return (
              <Link key={script.id} href={`/scripts/training/${script.id}`}>
                <Card className="bg-card border-border hover:border-[#7af17a]/40 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-medium line-clamp-1">
                        {script.title}
                      </CardTitle>
                      <Badge className={`${difficulty.color} border-0 text-xs shrink-0 ml-2`}>
                        {difficulty.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {script.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {script.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Brain className="h-3 w-3" />
                        {nodeCount} noeuds
                      </span>
                      {script.category && (
                        <Badge variant="outline" className="text-xs border-border">
                          {script.category}
                        </Badge>
                      )}
                    </div>
                    {best !== undefined && (
                      <div className="mt-3 flex items-center gap-1 text-xs">
                        <CheckCircle className="h-3 w-3 text-[#7af17a]" />
                        <span className="text-[#7af17a]">Meilleur : {best}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Historique récent</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map((result) => (
              <Card key={result.id} className="bg-card border-border">
                <CardContent className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        result.score >= 80
                          ? "bg-brand/10"
                          : result.score >= 50
                          ? "bg-muted/60"
                          : "bg-muted/40"
                      }`}
                    >
                      <Target
                        className={`h-4 w-4 ${
                          result.score >= 80
                            ? "text-brand"
                            : result.score >= 50
                            ? "text-muted-foreground"
                            : "text-muted-foreground/60"
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {result.script_flowcharts?.title || "Script supprimé"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {Math.floor(result.duration / 60)}:{String(result.duration % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <Badge
                      className={`${
                        result.score >= 80
                          ? "bg-brand/20 text-brand"
                          : result.score >= 50
                          ? "bg-muted-foreground/20 text-muted-foreground"
                          : "bg-foreground/20 text-foreground"
                      } border-0`}
                    >
                      {result.score}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
