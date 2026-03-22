"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";

interface Objection {
  count: number;
  category: string;
  suggestion: string;
  examples: string[];
}

export function ObjectionsView({
  objections,
  totalMessages,
}: {
  objections: Objection[];
  totalMessages?: number;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const totalObjections = objections.reduce((s, o) => s + o.count, 0);

  return (
    <div>
      <PageHeader
        title="Objections récurrentes"
        description="Analyse automatique des objections détectées dans vos conversations"
      >
        <Link href="/analytics">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      {/* Summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
                <Shield className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {totalObjections}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Objections détectées
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <MessageSquare className="h-5 w-5 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {totalMessages || 0}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Messages analysés
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {objections.length}
            </p>
            <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
              Catégories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Objection cards */}
      {objections.length > 0 ? (
        <div className="space-y-4">
          {objections.map((objection, index) => {
            const isExpanded = expandedIndex === index;
            const pct =
              totalObjections > 0
                ? Math.round((objection.count / totalObjections) * 100)
                : 0;

            return (
              <Card
                key={objection.category}
                className="border-border/50 hover:shadow-md transition-all"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
                        <Shield className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {objection.category}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pct}% des objections
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="text-sm font-semibold"
                    >
                      {objection.count}x
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Suggestion */}
                  <div className="flex items-start gap-2 bg-[#10b981]/5 border border-[#10b981]/20 rounded-lg p-3">
                    <TrendingUp className="h-4 w-4 text-[#10b981] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#10b981]/90">
                      {objection.suggestion}
                    </p>
                  </div>

                  {/* Expandable examples */}
                  {objection.examples.length > 0 && (
                    <div>
                      <button
                        onClick={() =>
                          setExpandedIndex(isExpanded ? null : index)
                        }
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {isExpanded ? "Masquer" : "Voir"} les exemples (
                        {objection.examples.length})
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          {objection.examples.map((example, i) => (
                            <div
                              key={i}
                              className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 border border-border/50"
                            >
                              &laquo; {example} &raquo;
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Aucune objection détectée pour le moment.
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Les objections seront analysées automatiquement à partir de vos
              conversations de prospection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
