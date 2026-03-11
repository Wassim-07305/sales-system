"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  MessageSquare,
  Target,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateAIScript, type AIScriptData } from "@/lib/actions/ai-scripts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface AIScriptsViewProps {
  script: AIScriptData | null;
  role: string;
  userId: string;
}

export function AIScriptsView({ script: initialScript, role }: AIScriptsViewProps) {
  const [script, setScript] = useState<AIScriptData | null>(initialScript);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedObjections, setExpandedObjections] = useState<Record<string, boolean>>({});
  const [isGenerating, startGenerating] = useTransition();

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success("Copié dans le presse-papiers");
  };

  const handleGenerate = () => {
    startGenerating(async () => {
      const result = await generateAIScript();
      if ("error" in result) {
        toast.error(result.error ?? "Erreur lors de la génération");
      } else if (result.script) {
        setScript(result.script);
        toast.success("Script généré avec succès !");
      }
    });
  };

  const toggleObjection = (key: string) => {
    setExpandedObjections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isB2B = role === "client_b2b";

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Scripts IA"
        description={
          isB2B
            ? "Générez des scripts de prospection personnalisés grâce à l'IA"
            : "Script de prospection généré par votre manager"
        }
      >
        {isB2B && (
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {script ? "Régénérer le script" : "Générer le script"}
              </>
            )}
          </Button>
        )}
      </PageHeader>

      {/* Message lecture seule pour client_b2c */}
      {!isB2B && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400">
          Script en lecture seule — généré par votre manager
        </div>
      )}

      {/* État de chargement */}
      {isGenerating && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="mb-4 h-10 w-10 animate-spin text-[#7af17a]" />
            <p className="text-lg font-medium">Génération en cours...</p>
            <p className="text-sm text-muted-foreground">
              L&apos;IA analyse votre profil et crée votre script personnalisé
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isGenerating && !script && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">Aucun script généré</p>
            <p className="text-sm text-muted-foreground">
              {isB2B
                ? "Cliquez sur \"Générer le script\" pour créer votre script personnalisé"
                : "Votre manager n'a pas encore généré de script pour vous"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Script affiché */}
      {!isGenerating && script && (
        <div className="space-y-4">
          {/* Accroche */}
          <Card className="border-[#7af17a]/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-[#7af17a]" />
                Accroche
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg bg-muted/50 p-4 pr-12 text-sm leading-relaxed">
                {script.accroche}
                <button
                  onClick={() => handleCopy(script.accroche, "accroche")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedKey === "accroche" ? (
                    <Check className="h-4 w-4 text-[#7af17a]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Flowchart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-blue-400" />
                Flowchart de conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {script.flowchart.map((etape, etapeIndex) => (
                <div key={etapeIndex} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold">
                      {etape.etape}
                    </Badge>
                    {etapeIndex < script.flowchart.length - 1 && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Questions */}
                  {etape.questions.length > 0 && (
                    <div className="ml-4 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Questions
                      </p>
                      <ul className="space-y-1.5">
                        {etape.questions.map((question, qIndex) => (
                          <li
                            key={qIndex}
                            className="flex items-start gap-2 text-sm"
                          >
                            <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
                            {question}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Objections */}
                  {etape.objections.length > 0 && (
                    <div className="ml-4 space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Gestion des objections
                      </p>
                      <div className="space-y-2">
                        {etape.objections.map((obj, oIndex) => {
                          const key = `${etapeIndex}-${oIndex}`;
                          const isExpanded = expandedObjections[key];
                          return (
                            <div
                              key={oIndex}
                              className="rounded-lg border bg-muted/30 overflow-hidden"
                            >
                              <button
                                onClick={() => toggleObjection(key)}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                              >
                                <span className="font-medium text-amber-400">
                                  &quot;{obj.objection}&quot;
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "h-4 w-4 text-muted-foreground transition-transform shrink-0",
                                    isExpanded && "rotate-90"
                                  )}
                                />
                              </button>
                              {isExpanded && (
                                <div className="border-t px-3 py-2 text-sm text-muted-foreground">
                                  {obj.reponse}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {etapeIndex < script.flowchart.length - 1 && (
                    <hr className="border-border/50" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="border-amber-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-400" />
                Call-to-Action
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-lg bg-muted/50 p-4 pr-12 text-sm leading-relaxed">
                {script.cta}
                <button
                  onClick={() => handleCopy(script.cta, "cta")}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedKey === "cta" ? (
                    <Check className="h-4 w-4 text-[#7af17a]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Date de génération */}
          <p className="text-center text-xs text-muted-foreground">
            Généré le{" "}
            {format(new Date(script.generated_at), "d MMMM yyyy 'à' HH:mm", {
              locale: fr,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
