"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  TrendingUp,
  Flame,
  Snowflake,
  BarChart3,
  RefreshCw,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { calculateProspectScore } from "@/lib/actions/hub-setting";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ProspectScore {
  engagement_score: number;
  calculated_at: string;
}

interface Prospect {
  id: string;
  name: string;
  platform: string;
  status: string;
  profile_url: string | null;
  created_at: string;
  updated_at?: string;
  scores: ProspectScore | null;
}

interface Props {
  prospects: Prospect[];
}

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  replied: "Répondu",
  interested: "Intéressé",
  booked: "RDV pris",
  converted: "Converti",
  lost: "Perdu",
};

const platformLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

export function ScoringView({ prospects }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recalculating, setRecalculating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const scores = prospects
    .map((p) => p.scores?.engagement_score)
    .filter((s): s is number => typeof s === "number");

  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  const hotProspects = prospects.filter(
    (p) => (p.scores?.engagement_score ?? 0) > 80
  );
  const coldProspects = prospects.filter(
    (p) => (p.scores?.engagement_score ?? 0) < 30
  );

  const filtered = prospects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleRecalculate(prospectId: string) {
    setRecalculating(prospectId);
    startTransition(async () => {
      try {
        const newScore = await calculateProspectScore(prospectId);
        toast.success(`Score recalculé : ${newScore}`);
        router.refresh();
      } catch {
        toast.error("Erreur lors du recalcul");
      } finally {
        setRecalculating(null);
      }
    });
  }

  function getScoreColor(score: number) {
    if (score > 80) return "bg-green-100 text-green-700";
    if (score > 50) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  }

  function getScoreBarColor(score: number) {
    if (score > 80) return "[&>div]:bg-green-500";
    if (score > 50) return "[&>div]:bg-orange-400";
    return "[&>div]:bg-red-500";
  }

  return (
    <div>
      <PageHeader
        title="Scoring des prospects"
        description="Évaluez et priorisez vos prospects par score d'engagement"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}</p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{hotProspects.length}</p>
              <p className="text-xs text-muted-foreground">
                Prospects chauds (&gt;80)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Snowflake className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{coldProspects.length}</p>
              <p className="text-xs text-muted-foreground">
                Prospects froids (&lt;30)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un prospect..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Scoring Table */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-3 p-4 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-3">Prospect</div>
            <div className="col-span-2">Score</div>
            <div className="col-span-2">Plateforme</div>
            <div className="col-span-2">Statut</div>
            <div className="col-span-2">Dernier contact</div>
            <div className="col-span-1"></div>
          </div>

          <div className="divide-y">
            {filtered.map((prospect) => {
              const score = prospect.scores?.engagement_score ?? 0;
              return (
                <div
                  key={prospect.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 items-center hover:bg-muted/50 transition-colors"
                >
                  {/* Name */}
                  <div className="sm:col-span-3 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
                      {prospect.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="font-medium text-sm">{prospect.name}</p>
                  </div>

                  {/* Score */}
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Progress
                      value={score}
                      className={`h-2 flex-1 ${getScoreBarColor(score)}`}
                    />
                    <Badge className={`${getScoreColor(score)} text-xs min-w-[3rem] justify-center`}>
                      {score}
                    </Badge>
                  </div>

                  {/* Platform */}
                  <div className="sm:col-span-2">
                    <Badge variant="outline" className="text-xs">
                      {platformLabels[prospect.platform] || prospect.platform}
                    </Badge>
                  </div>

                  {/* Status */}
                  <div className="sm:col-span-2">
                    <Badge variant="outline" className="text-xs">
                      {statusLabels[prospect.status] || prospect.status}
                    </Badge>
                  </div>

                  {/* Last contact */}
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    {prospect.scores?.calculated_at
                      ? formatDistanceToNow(
                          new Date(prospect.scores.calculated_at),
                          { addSuffix: true, locale: fr }
                        )
                      : prospect.updated_at
                      ? formatDistanceToNow(new Date(prospect.updated_at), {
                          addSuffix: true,
                          locale: fr,
                        })
                      : formatDistanceToNow(new Date(prospect.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                  </div>

                  {/* Recalculate */}
                  <div className="sm:col-span-1 flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRecalculate(prospect.id)}
                      disabled={recalculating === prospect.id}
                      title="Recalculer le score"
                    >
                      {recalculating === prospect.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aucun prospect trouvé
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
