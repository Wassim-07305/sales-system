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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Objections détectées</p>
                <p className="text-2xl font-bold">{totalObjections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Messages analysés</p>
                <p className="text-2xl font-bold">{totalMessages || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Catégories</p>
                <p className="text-2xl font-bold">{objections.length}</p>
              </div>
            </div>
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
              <Card key={objection.category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{objection.category}</CardTitle>
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
                  <div className="flex items-start gap-2 bg-[#7af17a]/5 border border-[#7af17a]/20 rounded-lg p-3">
                    <TrendingUp className="h-4 w-4 text-[#7af17a] mt-0.5 shrink-0" />
                    <p className="text-sm text-[#7af17a]/90">{objection.suggestion}</p>
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
                        {isExpanded ? "Masquer" : "Voir"} les exemples ({objection.examples.length})
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
              Les objections seront analysées automatiquement à partir de vos conversations de prospection.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
