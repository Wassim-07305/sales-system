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
import Link from "next/link";
import {
  Zap,
  Heart,
  TrendingUp,
  Users,
  Activity,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Play,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  createAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
  runAutomationCheck,
} from "@/lib/actions/automation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  trigger_conditions: Record<string, unknown>;
  actions: unknown[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

interface AutomationExecution {
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
  executions: AutomationExecution[];
  todayExecutions?: AutomationExecution[];
}

const typeLabels: Record<string, string> = {
  nurturing: "Nurturing",
  upsell: "Upsell",
  placement: "Placement",
  general: "Général",
};

const typeColors: Record<string, string> = {
  nurturing: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  upsell: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  placement: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  general: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const typeIcons: Record<string, typeof Zap> = {
  nurturing: Heart,
  upsell: TrendingUp,
  placement: Users,
  general: Zap,
};

const triggerOptions = [
  { value: "no_response_2_days", label: "Pas de réponse (2 jours)" },
  { value: "deal_stage_change", label: "Changement d'étape deal" },
  { value: "new_lead", label: "Nouveau lead" },
  { value: "no_activity_7d", label: "Aucune activité (7 jours)" },
  { value: "no_activity_14d", label: "Aucune activité (14 jours)" },
  { value: "call_completed", label: "Appel terminé" },
  { value: "booking_created", label: "RDV créé" },
  { value: "contract_signed", label: "Contrat signé" },
  { value: "subscription_renewal", label: "Renouvellement abonnement" },
];

const actionOptions = [
  { value: "send_message", label: "Envoyer un message" },
  { value: "create_task", label: "Créer une tâche" },
  { value: "notify_manager", label: "Notifier le manager" },
  { value: "send_email", label: "Envoyer un email" },
  { value: "send_sms", label: "Envoyer un SMS" },
];

export function AutomationView({ rules, executions, todayExecutions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("");
  const [actionType, setActionType] = useState("");
  const [ruleType, setRuleType] = useState<string>("general");

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.is_active).length;
  const totalExecutions = executions.length;
  const todayCount =
    todayExecutions?.length ??
    executions.filter((e) => {
      if (!e.created_at) return false;
      const d = new Date(e.created_at);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;

  const recentExecutions = executions.slice(0, 10);

  function resetForm() {
    setName("");
    setTriggerEvent("");
    setActionType("");
    setRuleType("general");
  }

  function handleCreate() {
    if (!name.trim() || !triggerEvent) {
      toast.error("Veuillez remplir le nom et le déclencheur");
      return;
    }

    startTransition(async () => {
      try {
        await createAutomationRule({
          name: name.trim(),
          type: ruleType as "nurturing" | "upsell" | "placement" | "general",
          trigger_conditions: {
            event: triggerEvent,
            action: actionType || "notify_manager",
          },
          actions: [{ type: actionType || "notify_manager" }],
          is_active: true,
        });
        toast.success("Règle créée avec succès");
        setDialogOpen(false);
        resetForm();
        router.refresh();
      } catch {
        toast.error("Erreur lors de la création de la règle");
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

  function handleRunCheck() {
    startTransition(async () => {
      try {
        const result = await runAutomationCheck();
        toast.success(
          `Vérification terminée : ${result.checked} règle(s) analysée(s), ${result.triggered} action(s) déclenchée(s)`,
        );
        router.refresh();
      } catch {
        toast.error("Erreur lors de la vérification automatique");
      }
    });
  }

  return (
    <div>
      <PageHeader title="Automation" description="Workflows automatisés">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRunCheck}
            disabled={isPending}
          >
            {isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isPending ? "Vérification..." : "Lancer la vérification"}
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-dark hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle règle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer une règle d&apos;automation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Nom de la règle</Label>
                  <Input
                    placeholder="Ex: Relance automatique après 2 jours"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={ruleType} onValueChange={setRuleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Type de règle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Général</SelectItem>
                      <SelectItem value="nurturing">Nurturing</SelectItem>
                      <SelectItem value="upsell">Upsell</SelectItem>
                      <SelectItem value="placement">Placement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Déclencheur</Label>
                  <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un déclencheur" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Action</Label>
                  <Select value={actionType} onValueChange={setActionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                  onClick={handleCreate}
                  disabled={isPending}
                >
                  {isPending ? "Création..." : "Créer la règle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRules}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Règles totales
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRules}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Règles actives
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <RefreshCw className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayCount}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Exécutions aujourd&apos;hui
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalExecutions}</p>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Actions déclenchées
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category cards linking to sub-pages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Link href="/automation/nurturing">
          <Card className="hover:border-brand transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold">Nurturing</p>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.type === "nurturing").length} règles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/automation/upsell">
          <Card className="hover:border-brand transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">Upsell</p>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.type === "upsell").length} règles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/automation/placement">
          <Card className="hover:border-brand transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Placement</p>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.type === "placement").length} règles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* All Rules with toggles */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Toutes les règles</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => {
                const Icon = typeIcons[rule.type] || Zap;
                const colorClass =
                  typeColors[rule.type] ||
                  "bg-gray-500/10 text-gray-600 border-gray-500/20";
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          rule.type === "nurturing"
                            ? "bg-pink-500/10"
                            : rule.type === "upsell"
                              ? "bg-purple-500/10"
                              : rule.type === "placement"
                                ? "bg-blue-500/10"
                                : "bg-gray-500/10"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${
                            rule.type === "nurturing"
                              ? "text-pink-600"
                              : rule.type === "upsell"
                                ? "text-purple-600"
                                : rule.type === "placement"
                                  ? "text-blue-600"
                                  : "text-gray-600"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{rule.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${colorClass}`}
                          >
                            {typeLabels[rule.type] || rule.type}
                          </Badge>
                          {rule.trigger_conditions?.event ? (
                            <span className="text-xs text-muted-foreground">
                              {triggerOptions.find(
                                (o) =>
                                  o.value ===
                                  String(rule.trigger_conditions.event),
                              )?.label || String(rule.trigger_conditions.event)}
                            </span>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(rule.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {rule.is_active ? "Active" : "Inactive"}
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
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Zap className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm">
                Aucune règle d&apos;automation. Cliquez sur &quot;Nouvelle
                règle&quot; pour commencer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions / Logs */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Exécutions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExecutions.length > 0 ? (
            <div className="space-y-3">
              {recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {exec.rule?.name || "Règle inconnue"}
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
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={typeColors[exec.rule?.type || ""] || ""}
                    >
                      {typeLabels[exec.rule?.type || ""] ||
                        exec.rule?.type ||
                        "—"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        exec.status === "completed"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : exec.status === "failed"
                            ? "bg-red-500/10 text-red-600 border-red-500/20"
                            : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                      }
                    >
                      {exec.status === "completed"
                        ? "Terminé"
                        : exec.status === "failed"
                          ? "Échoué"
                          : "En cours"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm">Aucune exécution récente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
