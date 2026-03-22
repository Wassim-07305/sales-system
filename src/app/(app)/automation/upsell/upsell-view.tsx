"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  updateAutomationRule,
  toggleAutomationRule,
  deleteAutomationRule,
} from "@/lib/actions/automation";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Plus,
  Trash2,
  Pencil,
  Zap,
  DollarSign,
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

const triggerConditions = [
  { value: "contract_signed", label: "Contrat signé" },
  { value: "deal_won", label: "Deal gagné" },
  { value: "subscription_renewal", label: "Renouvellement abonnement" },
  { value: "usage_threshold", label: "Seuil d'utilisation atteint" },
  { value: "health_score_high", label: "Health score élevé (>80)" },
];

export function UpsellView({ rules, executions }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [upsellOffer, setUpsellOffer] = useState("");
  const [minDealValue, setMinDealValue] = useState("");

  function resetForm() {
    setName("");
    setTrigger("");
    setUpsellOffer("");
    setMinDealValue("");
    setEditingRule(null);
  }

  function openEditDialog(rule: AutomationRule) {
    setEditingRule(rule);
    setName(rule.name);
    setTrigger(String(rule.trigger_conditions?.event || ""));
    setUpsellOffer(String(rule.trigger_conditions?.upsell_offer || ""));
    setMinDealValue(String(rule.trigger_conditions?.min_deal_value || ""));
    setDialogOpen(true);
  }

  function handleSave() {
    if (!name.trim() || !trigger) {
      toast.error("Veuillez remplir le nom et le déclencheur");
      return;
    }

    startTransition(async () => {
      try {
        if (editingRule) {
          await updateAutomationRule(editingRule.id, {
            name: name.trim(),
            trigger_conditions: {
              event: trigger,
              upsell_offer: upsellOffer,
              min_deal_value: parseFloat(minDealValue) || 0,
            },
            actions: [
              { type: "send_upsell_proposal" },
              { type: "notify_manager" },
            ],
          });
          toast.success("Règle mise à jour");
        } else {
          await createAutomationRule({
            name: name.trim(),
            type: "upsell",
            trigger_conditions: {
              event: trigger,
              upsell_offer: upsellOffer,
              min_deal_value: parseFloat(minDealValue) || 0,
            },
            actions: [
              { type: "send_upsell_proposal" },
              { type: "notify_manager" },
            ],
          });
          toast.success("Règle d'upsell créée");
        }
        setDialogOpen(false);
        resetForm();
        router.refresh();
      } catch {
        toast.error("Erreur lors de la sauvegarde");
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
        title="Règles d'Upsell"
        description="Automatisez les propositions d'upsell"
      >
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 text-black hover:bg-emerald-400">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle règle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Modifier la règle" : "Créer une règle d'upsell"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nom de la règle</Label>
                <Input
                  placeholder="Ex: Upsell après signature contrat premium"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Événement déclencheur</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerConditions.map((tc) => (
                      <SelectItem key={tc.value} value={tc.value}>
                        {tc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Offre d&apos;upsell</Label>
                <Textarea
                  placeholder="Décrivez l'offre à proposer automatiquement..."
                  value={upsellOffer}
                  onChange={(e) => setUpsellOffer(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Valeur minimale du deal (&euro;)</Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minDealValue}
                  onChange={(e) => setMinDealValue(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  La règle ne se déclenche que si le deal dépasse ce montant
                </p>
              </div>

              <Button
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending
                  ? "Sauvegarde..."
                  : editingRule
                    ? "Mettre à jour"
                    : "Créer la règle"}
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
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-xs"
                      >
                        Upsell
                      </Badge>
                      {rule.trigger_conditions?.event ? (
                        <span className="text-xs text-muted-foreground">
                          Trigger:{" "}
                          {triggerConditions.find(
                            (tc) =>
                              tc.value ===
                              String(rule.trigger_conditions.event),
                          )?.label || String(rule.trigger_conditions.event)}
                        </span>
                      ) : null}
                      {rule.trigger_conditions?.min_deal_value ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          | Min: <DollarSign className="h-3 w-3" />
                          {String(rule.trigger_conditions.min_deal_value)}
                        </span>
                      ) : null}
                    </div>
                    {rule.trigger_conditions?.upsell_offer ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        Offre: {String(rule.trigger_conditions.upsell_offer)}
                      </p>
                    ) : null}
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
                    onClick={() => openEditDialog(rule)}
                    disabled={isPending}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
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
                <TrendingUp className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm">
                Aucune règle d&apos;upsell. Créez-en une pour commencer.
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
                    <Zap className="h-4 w-4 text-purple-500" />
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
