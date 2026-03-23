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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
} from "@/lib/actions/automation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Heart, Plus, Trash2, Zap, Mail, MessageSquare } from "lucide-react";
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

const triggerEvents = [
  { value: "lead_created", label: "Nouveau lead créé" },
  { value: "no_activity_7d", label: "Aucune activité (7 jours)" },
  { value: "no_activity_14d", label: "Aucune activité (14 jours)" },
  { value: "call_completed", label: "Appel terminé" },
  { value: "booking_created", label: "RDV créé" },
  { value: "deal_stage_changed", label: "Changement d'étape deal" },
];

const actionTypes = [
  { value: "send_email", label: "Envoyer un email", icon: Mail },
  { value: "send_sms", label: "Envoyer un SMS", icon: MessageSquare },
  { value: "create_task", label: "Créer une tâche", icon: Zap },
];

export function NurturingView({ rules, executions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [delay, setDelay] = useState("0");
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  function handleCreate() {
    if (!name.trim() || !triggerEvent) {
      toast.error("Veuillez remplir le nom et le déclencheur");
      return;
    }

    startTransition(async () => {
      try {
        await createAutomationRule({
          name: name.trim(),
          type: "nurturing",
          trigger_conditions: {
            event: triggerEvent,
            delay_hours: parseInt(delay) || 0,
          },
          actions: selectedActions.map((a) => ({ type: a })),
        });
        toast.success("Règle de nurturing créée");
        setDialogOpen(false);
        setName("");
        setTriggerEvent("");
        setDelay("0");
        setSelectedActions([]);
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
    if (!confirm("Supprimer cette règle de nurturing ?")) return;
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

  function toggleAction(actionValue: string) {
    setSelectedActions((prev) =>
      prev.includes(actionValue)
        ? prev.filter((a) => a !== actionValue)
        : [...prev, actionValue],
    );
  }

  return (
    <div>
      <PageHeader
        title="Nurturing"
        description="Séquences de nurturing automatisées"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle règle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Créer une règle de nurturing</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nom de la règle</Label>
                <Input
                  placeholder="Ex: Relance après 7 jours d'inactivité"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Événement déclencheur</Label>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerEvents.map((evt) => (
                      <SelectItem key={evt.value} value={evt.value}>
                        {evt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Délai (heures)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Temps d&apos;attente après l&apos;événement déclencheur
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Actions</Label>
                <div className="space-y-2">
                  {actionTypes.map((action) => {
                    const Icon = action.icon;
                    const isSelected = selectedActions.includes(action.value);
                    return (
                      <div
                        key={action.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleAction(action.value)}
                      >
                        <Icon
                          className={`h-4 w-4 ${isSelected ? "text-emerald-500" : "text-muted-foreground"}`}
                        />
                        <span className="text-sm">{action.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={handleCreate}
                disabled={isPending}
              >
                {isPending ? "Création..." : "Créer la règle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Rules list */}
      <div className="space-y-4 mb-8">
        {rules.map((rule) => (
          <Card key={rule.id} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Heart className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="bg-pink-500/10 text-pink-600 border-pink-500/20 text-xs"
                      >
                        Nurturing
                      </Badge>
                      {rule.trigger_conditions?.event ? (
                        <span className="text-xs text-muted-foreground">
                          Déclencheur :{" "}
                          {triggerEvents.find(
                            (e) =>
                              e.value === String(rule.trigger_conditions.event),
                          )?.label || String(rule.trigger_conditions.event)}
                        </span>
                      ) : null}
                      {rule.trigger_conditions?.delay_hours ? (
                        <span className="text-xs text-muted-foreground">
                          | Délai: {String(rule.trigger_conditions.delay_hours)}
                          h
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {rule.is_active ? "Activée" : "Désactivée"}
                    </span>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={() =>
                        handleToggle(rule.id, rule.is_active)
                      }
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
          <Card className="border-border/50">
            <CardContent className="p-12 text-center text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Heart className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm">
                Aucune règle de nurturing. Créez-en une pour commencer.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent executions */}
      {executions.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Exécutions récentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executions.slice(0, 10).map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium">
                        {exec.rule?.name || "Règle"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exec.target_user?.full_name || "Utilisateur"} —{" "}
                        {exec.executed_at
                          ? formatDistanceToNow(new Date(exec.executed_at), {
                              addSuffix: true,
                              locale: fr,
                            })
                          : "En attente"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      exec.status === "completed"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                    }
                  >
                    {exec.status === "completed" ? "Terminé" : "En cours"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
