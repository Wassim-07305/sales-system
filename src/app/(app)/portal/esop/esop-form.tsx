"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Save,
  Send,
  Loader2,
  FileText,
  Target,
  MessageSquare,
  Camera,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  saveEsopDraft,
  submitEsop,
  type EsopSubmission,
  type EsopContent,
} from "@/lib/actions/esop";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Clock }
> = {
  brouillon: {
    label: "Brouillon",
    color: "bg-muted text-muted-foreground",
    icon: FileText,
  },
  soumis: {
    label: "En attente de validation",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: Clock,
  },
  en_revision: {
    label: "Révisions demandées",
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: AlertTriangle,
  },
  valide: {
    label: "Validé",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: CheckCircle2,
  },
};

const PRIX_OPTIONS = [
  "Moins de 500 €",
  "500 - 1 000 €",
  "1 000 - 2 000 €",
  "2 000 - 5 000 €",
  "Plus de 5 000 €",
];

interface EsopFormProps {
  esop: EsopSubmission | null;
}

export function EsopForm({ esop }: EsopFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState<EsopContent>(
    esop?.content || {
      nom_offre: "",
      prix_range: "",
      duree_accompagnement: "",
      ce_que_client_obtient: "",
      transformations_promises: ["", "", ""],
      description_client_ideal: "",
      tranche_age: "",
      situation_professionnelle: "",
      plateforme_principale: "",
      exemples_clients_signes: "",
      anciennete_vente: "",
      nombre_clients_total: "",
      messages_qui_fonctionnent: "",
      objections_frequentes: "",
      screenshots_urls: [],
      volume_messages_jour: "",
      calls_par_semaine: "",
      budget_pub: "",
    },
  );

  const status = esop?.status || "brouillon";
  const isReadOnly = status === "valide" || status === "soumis";
  const statusCfg = STATUS_CONFIG[status];
  const StatusIcon = statusCfg?.icon || FileText;

  function update(key: keyof EsopContent, value: string | string[]) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  function handleSaveDraft() {
    startTransition(async () => {
      const result = await saveEsopDraft(content);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Brouillon sauvegardé");
        router.refresh();
      }
    });
  }

  function handleSubmit() {
    // Basic validation
    if (!content.nom_offre || !content.description_client_ideal || !content.plateforme_principale) {
      toast.error("Veuillez remplir au minimum : nom de l'offre, client idéal et plateforme");
      return;
    }

    if (!confirm("Soumettre votre ESOP pour validation ? Vous ne pourrez plus le modifier.")) {
      return;
    }

    startTransition(async () => {
      // Save first
      await saveEsopDraft(content);
      // Then submit
      const result = await submitEsop();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("ESOP soumis pour validation !");
        router.refresh();
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Mon ESOP"
        description="Document de contexte pour votre setter — remplissez toutes les sections"
      >
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn("gap-1.5", statusCfg?.color)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusCfg?.label}
          </Badge>
          {!isReadOnly && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                disabled={isPending}
                className="gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Brouillon
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isPending}
                className="bg-emerald-500 text-black hover:bg-emerald-400 gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Soumettre
              </Button>
            </div>
          )}
        </div>
      </PageHeader>

      {/* Revision comments */}
      {status === "en_revision" && esop?.revision_comments && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-500">
                Révisions demandées
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {esop.revision_comments}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Votre offre */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              Votre offre
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Nom de l&apos;offre / programme
                </label>
                <Input
                  value={content.nom_offre}
                  onChange={(e) => update("nom_offre", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ex: Coaching Business Accelerator"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">Prix</label>
                <Select
                  value={content.prix_range}
                  onValueChange={(v) => update("prix_range", v)}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIX_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Durée d&apos;accompagnement
                </label>
                <Input
                  value={content.duree_accompagnement}
                  onChange={(e) => update("duree_accompagnement", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ex: 3 mois, 6 mois..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Ce que le client obtient concrètement
              </label>
              <Textarea
                value={content.ce_que_client_obtient}
                onChange={(e) => update("ce_que_client_obtient", e.target.value)}
                disabled={isReadOnly}
                placeholder="Décrivez les résultats concrets..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Les 3 principales transformations promises
              </label>
              {content.transformations_promises.map((t, i) => (
                <Input
                  key={i}
                  value={t}
                  onChange={(e) => {
                    const arr = [...content.transformations_promises];
                    arr[i] = e.target.value;
                    update("transformations_promises", arr);
                  }}
                  disabled={isReadOnly}
                  placeholder={`Transformation ${i + 1}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Votre cible */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Votre cible
            </h3>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Description du client idéal
              </label>
              <Textarea
                value={content.description_client_ideal}
                onChange={(e) =>
                  update("description_client_ideal", e.target.value)
                }
                disabled={isReadOnly}
                placeholder="Décrivez votre prospect type..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Tranche d&apos;âge approximative
                </label>
                <Input
                  value={content.tranche_age}
                  onChange={(e) => update("tranche_age", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ex: 25-45 ans"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Situation professionnelle typique
                </label>
                <Input
                  value={content.situation_professionnelle}
                  onChange={(e) =>
                    update("situation_professionnelle", e.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Ex: Entrepreneur solo, salarié..."
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Plateforme principale
              </label>
              <Select
                value={content.plateforme_principale}
                onValueChange={(v) => update("plateforme_principale", v)}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="les_deux">Les deux</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Exemples de profils de clients déjà signés
              </label>
              <Textarea
                value={content.exemples_clients_signes}
                onChange={(e) =>
                  update("exemples_clients_signes", e.target.value)
                }
                disabled={isReadOnly}
                placeholder="Décrivez 2-3 profils types..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Votre contexte */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              Votre contexte
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Depuis combien de temps vendez-vous cette offre ?
                </label>
                <Input
                  value={content.anciennete_vente}
                  onChange={(e) => update("anciennete_vente", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ex: 2 ans, 6 mois..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Combien de clients avez-vous eu ?
                </label>
                <Input
                  value={content.nombre_clients_total}
                  onChange={(e) =>
                    update("nombre_clients_total", e.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Ex: 30 clients"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Quels messages fonctionnent déjà ?
              </label>
              <Textarea
                value={content.messages_qui_fonctionnent}
                onChange={(e) =>
                  update("messages_qui_fonctionnent", e.target.value)
                }
                disabled={isReadOnly}
                placeholder="Décrivez les messages d'accroche qui marchent..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">
                Objections les plus fréquentes
              </label>
              <Textarea
                value={content.objections_frequentes}
                onChange={(e) =>
                  update("objections_frequentes", e.target.value)
                }
                disabled={isReadOnly}
                placeholder="Listez les objections récurrentes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Exemples de conversations */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-500" />
              Exemples de conversations
            </h3>
            <p className="text-sm text-muted-foreground">
              Ajoutez 3 à 5 exemples de vos meilleures conversations de
              prospection (captures d&apos;écran Instagram ou LinkedIn qui ont
              abouti à un call).
            </p>
            <p className="text-xs text-muted-foreground/60">
              Fonctionnalité d&apos;upload bientôt disponible. En attendant, vous
              pouvez décrire vos meilleures conversations dans le champ ci-dessous.
            </p>
            <Textarea
              value={content.screenshots_urls.join("\n")}
              onChange={(e) =>
                update(
                  "screenshots_urls",
                  e.target.value.split("\n").filter(Boolean),
                )
              }
              disabled={isReadOnly}
              placeholder="Décrivez vos meilleures conversations ou collez des liens..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Section 5: Objectifs setting */}
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Objectifs setting
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Messages / jour souhaités
                </label>
                <Input
                  value={content.volume_messages_jour}
                  onChange={(e) =>
                    update("volume_messages_jour", e.target.value)
                  }
                  disabled={isReadOnly}
                  placeholder="Ex: 30-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Calls à booker / semaine
                </label>
                <Input
                  value={content.calls_par_semaine}
                  onChange={(e) => update("calls_par_semaine", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ex: 5-10"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-muted-foreground">
                  Budget pub actuel
                </label>
                <Input
                  value={content.budget_pub}
                  onChange={(e) => update("budget_pub", e.target.value)}
                  disabled={isReadOnly}
                  placeholder="Ex: 500 €/mois ou N/A"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
