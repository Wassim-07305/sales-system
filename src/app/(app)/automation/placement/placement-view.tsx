"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  runPlacementWorkflow,
} from "@/lib/actions/automation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Users,
  Plus,
  Trash2,
  Play,
  Zap,
  CheckCircle2,
  ArrowRightLeft,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  trigger_conditions: Record<string, unknown>;
  actions: unknown[];
  is_active: boolean;
  created_at: string;
}

interface Execution {
  id: string;
  rule_id: string;
  target_user_id: string;
  status: string;
  executed_at: string | null;
  result: Record<string, unknown>;
  created_at: string;
  rule?: { id: string; name: string; type: string } | null;
  target_user?: { id: string; full_name: string | null } | null;
}

interface Props {
  rules: AutomationRule[];
  executions: Execution[];
}

export function PlacementView({ rules, executions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");

  function handleRunPlacement() {
    startTransition(async () => {
      try {
        const result = await runPlacementWorkflow();
        toast.success(`Placement terminé : ${result.matched} match(es) créé(s)`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du placement");
      }
    });
  }

  function handleCreateRule() {
    if (!name.trim()) {
      toast.error("Veuillez donner un nom à la règle");
      return;
    }

    startTransition(async () => {
      try {
        await createAutomationRule({
          name: name.trim(),
          type: "placement",
          trigger_conditions: {
            event: "setter_ready",
            match_criteria: "niche_and_availability",
          },
          actions: [{ type: "auto_match" }, { type: "notify_both_parties" }],
        });
        toast.success("Règle de placement créée");
        setDialogOpen(false);
        setName("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la création");
      }
    });
  }

  function handleToggle(id: string, currentActive: boolean) {
    startTransition(async () => {
      try {
        await toggleAutomationRule(id, !currentActive);
        toast.success(currentActive ? "Règle désactivée" : "Règle activée");
        router.refresh();
      } catch {
        toast.error("Erreur");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAutomationRule(id);
        toast.success("Règle supprimée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Placement Automatisé"
        description="Matching setters/entrepreneurs"
      >
        <div className="flex gap-2">
          <Button
            className="bg-brand text-brand-dark hover:bg-brand/90"
            onClick={handleRunPlacement}
            disabled={isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {isPending ? "Placement en cours..." : "Lancer le placement"}
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle règle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une règle de placement</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nom de la règle</Label>
                  <Input
                    placeholder="Ex: Matching automatique par niche"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Critères de matching</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Setter avec onboarding complété</li>
                    <li>- Entrepreneur avec listing actif</li>
                    <li>- Correspondance de niche</li>
                    <li>- Disponibilité du setter</li>
                  </ul>
                </div>
                <div className="rounded-lg border p-4 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Actions automatiques</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>- Matching automatique</li>
                    <li>- Notification aux deux parties</li>
                  </ul>
                </div>
                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={handleCreateRule}
                  disabled={isPending}
                >
                  {isPending ? "Création..." : "Créer la règle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Rules */}
      <div className="space-y-4 mb-8">
        <h3 className="font-semibold text-sm text-muted-foreground">Règles de placement</h3>
        {rules.map((rule) => (
          <Card key={rule.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Créée {formatDistanceToNow(new Date(rule.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {rule.is_active ? "Active" : "Inactive"}
                    </span>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() => handleToggle(rule.id, rule.is_active)}
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(rule.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {rules.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune règle de placement. Créez-en une pour lancer le matching.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent placement executions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Placements récents</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length > 0 ? (
            <div className="space-y-3">
              {executions.slice(0, 15).map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {exec.target_user?.full_name || "Setter"}{" "}
                        {exec.result?.matched_entrepreneur_id ? (
                          <span className="text-muted-foreground font-normal">
                            {" "}match avec entrepreneur
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exec.executed_at
                          ? formatDistanceToNow(new Date(exec.executed_at), { addSuffix: true, locale: fr })
                          : "En attente"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      exec.status === "completed"
                        ? "bg-green-100 text-green-700"
                        : exec.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                    }
                  >
                    {exec.status === "completed"
                      ? "Placé"
                      : exec.status === "failed"
                      ? "Échoué"
                      : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucun placement récent. Lancez le workflow pour matcher les setters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
