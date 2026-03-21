"use client";

import Link from "next/link";
import {
  MessageCircle,
  Users,
  Bell,
  Target,
  Play,
  Sparkles,
  BarChart3,
  Clock,
  Linkedin,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { EngageStats, CommentHistory } from "@/lib/actions/linkedin-engage";

interface Props {
  stats: EngageStats;
  recentActivity: CommentHistory[];
}

export function LinkedInEngageDashboard({ stats, recentActivity }: Props) {
  const goalPercent = Math.min(
    100,
    Math.round((stats.commentsToday / stats.dailyGoal) * 100),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkedIn Engage"
        description="Commentez stratégiquement pour attirer des prospects"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Comments today with goal progress */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-brand" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.commentsToday}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{stats.dailyGoal}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Commentaires aujourd&apos;hui
                </p>
              </div>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.profilesEngagedToday}</p>
                <p className="text-xs text-muted-foreground">
                  Profils engagés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalImpressions.toLocaleString("fr-FR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Impressions ce mois
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.bestHour !== null ? `${stats.bestHour}h` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Meilleure heure
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/dashboard/linkedin-engage/session">
          <Card className="cursor-pointer rounded-2xl shadow-sm hover:shadow-md transition-shadow border-brand/20">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                <Play className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="font-semibold">Démarrer une session</p>
                <p className="text-sm text-muted-foreground">
                  10 min de commentaires ciblés
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/linkedin-engage/recommandations">
          <Card className="cursor-pointer rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="font-semibold">Recommandations du jour</p>
                <p className="text-sm text-muted-foreground">
                  Profils suggérés par l&apos;IA
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/linkedin-engage/replies">
          <Card className="cursor-pointer rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-foreground/5 ring-1 ring-foreground/10 flex items-center justify-center">
                <Bell className="h-6 w-6 text-foreground" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <p className="font-semibold">Réponses en attente</p>
                  <p className="text-sm text-muted-foreground">
                    Répondez aux conversations
                  </p>
                </div>
                {stats.unreadReplies > 0 && (
                  <Badge className="bg-brand text-brand-dark">
                    {stats.unreadReplies}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Navigation links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Feeds",
            href: "/dashboard/linkedin-engage/feeds",
            icon: Linkedin,
          },
          {
            label: "Statistiques",
            href: "/dashboard/linkedin-engage/stats",
            icon: BarChart3,
          },
          {
            label: "Mon style",
            href: "/dashboard/linkedin-engage/mon-style",
            icon: Target,
          },
          {
            label: "Recommandations",
            href: "/dashboard/linkedin-engage/recommandations",
            icon: Sparkles,
          },
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="cursor-pointer rounded-xl shadow-sm hover:shadow-md transition-shadow h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun commentaire publié pour le moment. Commencez par créer un
              feed et commenter des posts !
            </p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50"
                >
                  <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Linkedin className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">
                        {comment.creator_name || "Créateur"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.posted_at).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" },
                        )}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {comment.comment_text}
                    </p>
                    {comment.impressions > 0 && (
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {comment.impressions} impressions
                        </span>
                        {comment.replies_count > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {comment.replies_count} réponses
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
