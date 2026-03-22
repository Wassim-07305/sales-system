"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  addStyleSample,
  deleteStyleSample,
  type StyleSample,
} from "@/lib/actions/linkedin-engage";

interface Props {
  initialSamples: StyleSample[];
}

export function MonStyleView({ initialSamples }: Props) {
  const [samples, setSamples] = useState(initialSamples);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleAdd() {
    if (!newComment.trim()) return;
    startTransition(async () => {
      try {
        const sample = await addStyleSample(newComment.trim());
        if (sample) {
          setSamples((prev) => [sample, ...prev]);
          setNewComment("");
          toast.success("Exemple ajouté");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  async function handleDelete(id: string) {
    try {
      await deleteStyleSample(id);
      setSamples((prev) => prev.filter((s) => s.id !== id));
      toast.success("Exemple supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon style de commentaire"
        description="Entraînez l'IA à écrire comme vous en ajoutant vos meilleurs commentaires"
      />

      {/* Info card */}
      <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-5 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              Plus vous ajoutez d&apos;exemples, plus l&apos;IA s&apos;adapte à votre style
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              5 exemples minimum recommandés. L&apos;IA analysera le ton, la longueur,
              le type d&apos;ouverture et la structure de vos commentaires pour les reproduire.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add new sample */}
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un exemple
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Collez ici un de vos meilleurs commentaires LinkedIn..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="rounded-xl"
          />
          <Button
            onClick={handleAdd}
            disabled={!newComment.trim() || isPending}
            className="rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
          >
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter cet exemple
          </Button>
        </CardContent>
      </Card>

      {/* Samples list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Mes exemples
            <Badge variant="outline" className="text-xs">
              {samples.length}
            </Badge>
          </h3>
          {samples.length < 5 && (
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
              {5 - samples.length} de plus recommandés
            </Badge>
          )}
        </div>

        {samples.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Aucun exemple de style. Ajoutez vos meilleurs commentaires LinkedIn
                pour que l&apos;IA apprenne votre style.
              </p>
            </CardContent>
          </Card>
        ) : (
          samples.map((sample) => (
            <Card key={sample.id} className="rounded-xl shadow-sm">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap">
                    {sample.example_comment}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ajouté le{" "}
                    {new Date(sample.added_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(sample.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
