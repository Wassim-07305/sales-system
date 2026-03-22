"use client";

import { useState, useTransition } from "react";
import {
  Sparkles,
  RefreshCw,
  Loader2,
  Users,
  ExternalLink,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  generateRecommendations,
  type Recommendation,
} from "@/lib/actions/linkedin-engage";

interface Props {
  initialRecommendations: Recommendation[];
}

export function RecommandationsView({ initialRecommendations }: Props) {
  const [recommendations, setRecommendations] = useState(
    initialRecommendations,
  );
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      try {
        const newRecs = await generateRecommendations();
        setRecommendations(newRecs);
        toast.success(`${newRecs.length} recommandations générées`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur IA");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Recommandations du jour"
          description="Profils suggérés par l'IA pour maximiser votre visibilité"
        />
        <Button
          onClick={handleRefresh}
          disabled={isPending}
          className="rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Rafraîchir les recommandations
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-1">Aucune recommandation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez sur &quot;Rafraîchir&quot; pour que l&apos;IA analyse votre historique
              et recommande des profils à commenter.
            </p>
            <Button
              onClick={handleRefresh}
              disabled={isPending}
              className="rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Générer des recommandations
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="rounded-2xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {rec.profile_photo_url ? (
                    <img
                      src={rec.profile_photo_url}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-emerald-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {rec.profile_name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0"
                      >
                        <Star className="h-3 w-3 mr-0.5" />
                        {rec.score}/100
                      </Badge>
                    </div>
                    {rec.profile_title && (
                      <p className="text-xs text-muted-foreground truncate">
                        {rec.profile_title}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-2">
                      {rec.reason}
                    </p>
                    {rec.profile_url && (
                      <a
                        href={rec.profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Voir le profil
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
