"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Plus,
  Mail,
  Trash2,
  Users,
  ArrowDown,
  Clock,
  MessageCircle,
  UserPlus,
  ThumbsUp,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  createDripCampaign,
  toggleDripCampaign,
  deleteDripCampaign,
  type DripCampaign,
  type DripCampaignStep,
} from "@/lib/actions/drip-campaigns";

const ACTION_TYPE_LABELS: Record<string, string> = {
  send_dm: "Envoyer un DM",
  follow_up: "Relance",
  like_post: "Liker un post",
  comment: "Commenter",
  connection_request: "Demande de connexion",
};

const ACTION_TYPE_ICONS: Record<string, React.ReactNode> = {
  send_dm: <MessageCircle className="h-4 w-4" />,
  follow_up: <Mail className="h-4 w-4" />,
  like_post: <ThumbsUp className="h-4 w-4" />,
  comment: <MessageSquare className="h-4 w-4" />,
  connection_request: <UserPlus className="h-4 w-4" />,
};

interface StepFormData {
  delay_days: number;
  template_id: string;
  action_type: string;
  custom_message: string;
}

interface Props {
  campaigns: DripCampaign[];
  lists: { id: string; name: string; source?: string }[];
  templates: { id: string; name: string; content?: string; step?: string }[];
}

export function CampaignsView({ campaigns, lists, templates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState("");
  const [listId, setListId] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepFormData[]>([
    { delay_days: 0, template_id: "", action_type: "send_dm", custom_message: "" },
  ]);

  function addStep() {
    const lastStep = steps[steps.length - 1];
    setSteps([
      ...steps,
      {
        delay_days: (lastStep?.delay_days || 0) + 3,
        template_id: "",
        action_type: "follow_up",
        custom_message: "",
      },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof StepFormData, value: string | number) {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  }

  function resetForm() {
    setName("");
    setListId("");
    setDescription("");
    setSteps([
      { delay_days: 0, template_id: "", action_type: "send_dm", custom_message: "" },
    ]);
  }

  async function handleCreate() {
    if (!name.trim()) {
      toast.error("Veuillez saisir un nom de campagne");
      return;
    }
    if (!listId) {
      toast.error("Veuillez sélectionner une liste de prospects");
      return;
    }
    if (steps.length === 0) {
      toast.error("Ajoutez au moins une étape");
      return;
    }

    startTransition(async () => {
      try {
        await createDripCampaign({
          name: name.trim(),
          list_id: listId,
          description: description.trim() || undefined,
          steps: steps.map((s, idx) => ({
            order: idx + 1,
            delay_days: s.delay_days,
            template_id: s.template_id || null,
            action_type: s.action_type as DripCampaignStep["action_type"],
            custom_message: s.custom_message || undefined,
          })),
        });
        toast.success("Campagne créée avec succès");
        setCreateOpen(false);
        resetForm();
        router.refresh();
      } catch {
        toast.error("Erreur lors de la création de la campagne");
      }
    });
  }

  async function handleToggle(id: string) {
    startTransition(async () => {
      try {
        await toggleDripCampaign(id);
        router.refresh();
      } catch {
        toast.error("Erreur lors du changement de statut");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteDripCampaign(id);
        toast.success("Campagne supprimée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  }

  function getStatusBadge(campaign: DripCampaign) {
    if (campaign.is_active) {
      return <Badge className="bg-brand/10 text-brand border border-brand/20">Active</Badge>;
    }
    if (campaign.executions_count && campaign.executions_count > 0 && campaign.completed_count === campaign.executions_count) {
      return <Badge className="bg-muted/40 text-muted-foreground/60 border border-border/30">Terminée</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">En pause</Badge>;
  }

  function getProgress(campaign: DripCampaign) {
    if (!campaign.executions_count || campaign.executions_count === 0) return 0;
    return Math.round((campaign.completed_count || 0) / campaign.executions_count * 100);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campagnes Drip"
        description="Automatisez vos sequences de prospection avec des campagnes multi-étapes"
      >
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle campagne
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Créer une campagne</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Campaign Info */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name">Nom de la campagne</Label>
                    <Input
                      id="campaign-name"
                      placeholder="Ex: Sequence LinkedIn Q1"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="campaign-desc">Description (optionnel)</Label>
                    <Textarea
                      id="campaign-desc"
                      placeholder="Objectif de cette campagne..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Liste de prospects cible</Label>
                    <Select value={listId} onValueChange={setListId}>
                      <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                        <SelectValue placeholder="Sélectionner une liste" />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                            {list.source ? ` (${list.source})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Étapes de la séquence</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addStep}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {steps.map((step, idx) => (
                      <div key={idx}>
                        {/* Arrow connector */}
                        {idx > 0 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}

                        <Card className="border-dashed">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-muted-foreground">
                                Étape {idx + 1}
                              </span>
                              {steps.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStep(idx)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs">Délai (jours)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={step.delay_days}
                                  onChange={(e) =>
                                    updateStep(idx, "delay_days", parseInt(e.target.value) || 0)
                                  }
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Action</Label>
                                <Select
                                  value={step.action_type}
                                  onValueChange={(v) => updateStep(idx, "action_type", v)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="send_dm">Envoyer un DM</SelectItem>
                                    <SelectItem value="follow_up">Relance</SelectItem>
                                    <SelectItem value="like_post">Liker un post</SelectItem>
                                    <SelectItem value="comment">Commenter</SelectItem>
                                    <SelectItem value="connection_request">
                                      Demande de connexion
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">Template</Label>
                                <Select
                                  value={step.template_id}
                                  onValueChange={(v) => updateStep(idx, "template_id", v)}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Optionnel" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {templates.map((t) => (
                                      <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="mt-3">
                              <Label className="text-xs">Message personnalisé (optionnel)</Label>
                              <Textarea
                                placeholder="Message spécifique pour cette étape..."
                                value={step.custom_message}
                                onChange={(e) =>
                                  updateStep(idx, "custom_message", e.target.value)
                                }
                                rows={2}
                                className="mt-1"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={isPending}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Créer la campagne
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Campagnes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-brand">
              {campaigns.filter((c) => c.is_active).length}
            </p>
            <p className="text-xs text-muted-foreground">Actives</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + (c.prospect_count || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Prospects cibles</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">
              {campaigns.reduce((sum, c) => sum + (c.executions_count || 0), 0)}
            </p>
            <p className="text-xs text-muted-foreground">Exécutions</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="shadow-sm rounded-2xl">
          <CardContent className="py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune campagne</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Créez votre première campagne drip pour automatiser votre prospection
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Creer une campagne
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden shadow-sm rounded-2xl">
              <CardContent className="p-0">
                {/* Campaign Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">
                          {campaign.name}
                        </h3>
                        {getStatusBadge(campaign)}
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {campaign.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {campaign.list_name || "Liste inconnue"} ({campaign.prospect_count} prospects)
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5" />
                          {campaign.steps.length} étape{campaign.steps.length > 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {campaign.executions_count || 0} exécutions
                        </span>
                      </div>

                      {/* Progress bar */}
                      {(campaign.executions_count || 0) > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progression</span>
                            <span className="font-medium">{getProgress(campaign)}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all"
                              style={{ width: `${getProgress(campaign)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {campaign.is_active ? "Active" : "Pause"}
                        </span>
                        <Switch
                          checked={campaign.is_active}
                          onCheckedChange={() => handleToggle(campaign.id)}
                          disabled={isPending}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(expandedId === campaign.id ? null : campaign.id)
                        }
                        className="h-8 w-8 p-0"
                      >
                        {expandedId === campaign.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(campaign.id)}
                        disabled={isPending}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded: Workflow Visualization */}
                {expandedId === campaign.id && (
                  <div className="border-t bg-muted/30 p-5">
                    <h4 className="text-sm font-semibold mb-4">Workflow de la séquence</h4>
                    <div className="space-y-0">
                      {campaign.steps.map((step, idx) => (
                        <div key={step.id || idx}>
                          {/* Step node */}
                          <div className="flex items-start gap-3">
                            {/* Vertical connector line */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-9 w-9 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${
                                  campaign.is_active
                                    ? "bg-brand/20 text-brand ring-1 ring-brand/30"
                                    : "bg-muted text-muted-foreground ring-1 ring-border"
                                }`}
                              >
                                {idx + 1}
                              </div>
                              {idx < campaign.steps.length - 1 && (
                                <div className="w-0.5 h-8 bg-border mt-1" />
                              )}
                            </div>

                            {/* Step details */}
                            <div className="flex-1 pb-4">
                              <div className="flex items-center gap-2 mb-1">
                                {ACTION_TYPE_ICONS[step.action_type]}
                                <span className="font-medium text-sm">
                                  {ACTION_TYPE_LABELS[step.action_type] || step.action_type}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {step.delay_days === 0
                                    ? "Immédiat"
                                    : `J+${step.delay_days}`}
                                </Badge>
                              </div>
                              {step.template_name && (
                                <p className="text-xs text-muted-foreground">
                                  Template : {step.template_name}
                                </p>
                              )}
                              {step.custom_message && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  &quot;{step.custom_message}&quot;
                                </p>
                              )}
                              {/* Execution stats if available */}
                              {(() => {
                                const s = step as unknown as Record<string, unknown>;
                                const sent = (s.sent as number) || 0;
                                const completed = (s.step_completed as number) || 0;
                                if (sent <= 0) return null;
                                return (
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                    <span>
                                      {sent} envoyé{sent > 1 ? "s" : ""}
                                    </span>
                                    <span>
                                      {completed} terminé{completed > 1 ? "s" : ""}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
