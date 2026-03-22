"use client";

import Link from "next/link";
import { ArrowLeft, Users, BookOpen, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SetterProgress {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  currentModule: string | null;
  progressPercent: number;
  bestQuizScore: number | null;
  lastActivity: string | null;
  completedLessons: number;
  totalLessons: number;
}

interface ProgressViewProps {
  progress: SetterProgress[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProgressView({ progress }: ProgressViewProps) {
  // KPIs
  const totalSetters = progress.length;
  const activeSetters = progress.filter((p) => p.completedLessons > 0).length;
  const avgProgress =
    totalSetters > 0
      ? Math.round(
          progress.reduce((s, p) => s + p.progressPercent, 0) / totalSetters,
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/academy/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour admin Academy
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-emerald-500/10 p-2.5">
            <Users className="h-6 w-6 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Progression des setters</h1>
            <p className="text-sm text-muted-foreground">
              Suivi detaille de l&apos;avancement Academy
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalSetters}</p>
                <p className="text-xs text-muted-foreground">
                  Setters / Closers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{activeSetters}</p>
                <p className="text-xs text-muted-foreground">
                  Actifs (au moins 1 lecon)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{avgProgress}%</p>
                <p className="text-xs text-muted-foreground">
                  Progression moyenne
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {progress.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucun setter inscrit.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tableau de progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4 font-medium">Setter</th>
                    <th className="pb-3 pr-4 font-medium">Module actuel</th>
                    <th className="pb-3 pr-4 font-medium text-center">
                      Progression
                    </th>
                    <th className="pb-3 pr-4 font-medium text-center">
                      Meilleur score
                    </th>
                    <th className="pb-3 font-medium text-right">
                      Derniere activite
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((p) => (
                    <tr key={p.userId} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {p.avatarUrl ? (
                            <img
                              src={p.avatarUrl}
                              alt={p.fullName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                              {p.fullName
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{p.fullName}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {p.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm">
                          {p.currentModule || "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full max-w-[120px] h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                p.progressPercent >= 80
                                  ? "bg-emerald-500"
                                  : p.progressPercent >= 40
                                    ? "bg-amber-500"
                                    : "bg-muted-foreground/40",
                              )}
                              style={{ width: `${p.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {p.completedLessons}/{p.totalLessons} (
                            {p.progressPercent}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        {p.bestQuizScore !== null ? (
                          <Badge
                            variant={
                              p.bestQuizScore >= 90 ? "default" : "secondary"
                            }
                            className={cn(
                              p.bestQuizScore >= 90 &&
                                "bg-emerald-500 text-black",
                            )}
                          >
                            {p.bestQuizScore}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">
                        {formatDate(p.lastActivity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
