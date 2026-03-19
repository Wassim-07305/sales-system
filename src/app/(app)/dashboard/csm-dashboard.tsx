"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  Users,
  MessageSquare,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  Flame,
  Send,
  Shield,
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
  createKickCase,
  createFeedback,
  updateKickCaseStatus,
  updateFeedbackStatus,
  type CsmClientInfo,
  type KickCase,
  type CsmFeedback,
} from "@/lib/actions/csm";

interface CsmDashboardProps {
  clients: CsmClientInfo[];
  atRiskClients: CsmClientInfo[];
  kickCases: KickCase[];
  feedbacks: CsmFeedback[];
}

function getHealthColor(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getHealthLabel(score: number) {
  if (score >= 70) return "Bon";
  if (score >= 40) return "Moyen";
  return "En danger";
}

const KICKCASE_TYPES = [
  { value: "blocage_technique", label: "Blocage technique" },
  { value: "manque_motivation", label: "Manque de motivation" },
  { value: "probleme_resultats", label: "Problème de résultats" },
  { value: "autre", label: "Autre" },
];

const FEEDBACK_CATEGORIES = [
  { value: "formation", label: "Formation" },
  { value: "crm", label: "CRM" },
  { value: "communaute", label: "Communauté" },
  { value: "processus", label: "Processus" },
  { value: "autre", label: "Autre" },
];

export function CsmDashboard({
  clients,
  atRiskClients,
  kickCases,
  feedbacks,
}: CsmDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Kick-case form
  const [kcClientId, setKcClientId] = useState("");
  const [kcType, setKcType] = useState("blocage_technique");
  const [kcDesc, setKcDesc] = useState("");
  const [kcAction, setKcAction] = useState("");
  const [showKcForm, setShowKcForm] = useState(false);
  const [kcFilter, setKcFilter] = useState("all");

  // Feedback form
  const [fbSource, setFbSource] = useState("");
  const [fbCategory, setFbCategory] = useState("formation");
  const [fbContent, setFbContent] = useState("");
  const [fbPriority, setFbPriority] = useState("moyenne");
  const [showFbForm, setShowFbForm] = useState(false);

  function handleCreateKickCase() {
    if (!kcClientId || !kcDesc.trim()) {
      toast.error("Client et description requis");
      return;
    }
    startTransition(async () => {
      const result = await createKickCase({
        client_id: kcClientId,
        type: kcType,
        description: kcDesc.trim(),
        action_entreprise: kcAction.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Kick-case créé");
        setKcDesc("");
        setKcAction("");
        setShowKcForm(false);
        router.refresh();
      }
    });
  }

  function handleCreateFeedback() {
    if (!fbSource.trim() || !fbContent.trim()) {
      toast.error("Source et feedback requis");
      return;
    }
    startTransition(async () => {
      const result = await createFeedback({
        source_name: fbSource.trim(),
        category: fbCategory,
        feedback: fbContent.trim(),
        priority: fbPriority,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Feedback créé");
        setFbSource("");
        setFbContent("");
        setShowFbForm(false);
        router.refresh();
      }
    });
  }

  function handleKcStatusChange(id: string, status: string) {
    startTransition(async () => {
      const result = await updateKickCaseStatus(id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Statut mis à jour");
        router.refresh();
      }
    });
  }

  function handleFbStatusChange(id: string, status: string) {
    startTransition(async () => {
      const result = await updateFeedbackStatus(id, status);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Statut mis à jour");
        router.refresh();
      }
    });
  }

  const filteredKc =
    kcFilter === "all"
      ? kickCases
      : kickCases.filter((kc) => kc.status === kcFilter);

  return (
    <div>
      <PageHeader
        title="Dashboard CSM"
        description="Suivi client, kick-cases et feedbacks terrain"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-brand mb-1" />
            <p className="text-2xl font-bold">{clients.length}</p>
            <p className="text-xs text-muted-foreground">Clients actifs</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold">{atRiskClients.length}</p>
            <p className="text-xs text-muted-foreground">En danger</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">
              {kickCases.filter((kc) => kc.status !== "resolu").length}
            </p>
            <p className="text-xs text-muted-foreground">Kick-cases ouverts</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border-border/50">
          <CardContent className="p-4 text-center">
            <MessageSquare className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">
              {feedbacks.filter((f) => f.status === "nouveau").length}
            </p>
            <p className="text-xs text-muted-foreground">Feedbacks nouveaux</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients en danger */}
      {atRiskClients.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            Clients en danger
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {atRiskClients.slice(0, 6).map((client) => (
              <Card key={client.id} className="rounded-xl border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {client.full_name || client.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            getHealthColor(client.health_score),
                          )}
                          style={{ width: `${client.health_score}%`, maxWidth: "60px", minWidth: "8px" }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {client.health_score}% — {getHealthLabel(client.health_score)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Suivi hebdomadaire */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Suivi hebdomadaire — tous les clients
        </h3>
        <Card className="rounded-xl border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="max-h-[300px] overflow-y-auto">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-border/30 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {client.full_name || client.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {client.company || client.role}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", getHealthColor(client.health_score))}
                          style={{ width: `${client.health_score}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {client.health_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kick-cases */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            Kick-cases cette semaine
          </h3>
          <div className="flex items-center gap-2">
            <Select value={kcFilter} onValueChange={setKcFilter}>
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="ouvert">Ouverts</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="resolu">Résolus</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKcForm(!showKcForm)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau
            </Button>
          </div>
        </div>

        {showKcForm && (
          <Card className="rounded-xl border-border/50 mb-3">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Select value={kcClientId} onValueChange={setKcClientId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Client concerné" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={kcType} onValueChange={setKcType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KICKCASE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={kcDesc}
                onChange={(e) => setKcDesc(e.target.value)}
                placeholder="Description du problème..."
                rows={2}
              />
              <Input
                value={kcAction}
                onChange={(e) => setKcAction(e.target.value)}
                placeholder="Action entreprise (optionnel)"
              />
              <Button
                size="sm"
                onClick={handleCreateKickCase}
                disabled={isPending}
                className="bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Créer
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {filteredKc.map((kc) => (
            <Card key={kc.id} className="rounded-xl border-border/50">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">
                      {kc.client?.full_name || "Client"}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {KICKCASE_TYPES.find((t) => t.value === kc.type)?.label || kc.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        kc.status === "resolu"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : kc.status === "en_cours"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500",
                      )}
                    >
                      {kc.status === "resolu" ? "Résolu" : kc.status === "en_cours" ? "En cours" : "Ouvert"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {kc.description}
                  </p>
                  {kc.action_entreprise && (
                    <p className="text-xs text-brand mt-1">
                      Action : {kc.action_entreprise}
                    </p>
                  )}
                </div>
                {kc.status !== "resolu" && (
                  <Select
                    value={kc.status}
                    onValueChange={(v) => handleKcStatusChange(kc.id, v)}
                  >
                    <SelectTrigger className="h-7 w-[100px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ouvert">Ouvert</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="resolu">Résolu</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
          {filteredKc.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun kick-case cette semaine
            </p>
          )}
        </div>
      </div>

      {/* Feedbacks terrain */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
            Feedbacks terrain
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFbForm(!showFbForm)}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau
          </Button>
        </div>

        {showFbForm && (
          <Card className="rounded-xl border-border/50 mb-3">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={fbSource}
                  onChange={(e) => setFbSource(e.target.value)}
                  placeholder="Source (setter ou entrepreneur)"
                />
                <Select value={fbCategory} onValueChange={setFbCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={fbContent}
                onChange={(e) => setFbContent(e.target.value)}
                placeholder="Feedback..."
                rows={2}
              />
              <div className="flex items-center gap-3">
                <Select value={fbPriority} onValueChange={setFbPriority}>
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleCreateFeedback}
                  disabled={isPending}
                  className="bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Créer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {feedbacks.slice(0, 10).map((fb) => (
            <Card key={fb.id} className="rounded-xl border-border/50">
              <CardContent className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{fb.source_name}</p>
                    <Badge variant="outline" className="text-xs">
                      {FEEDBACK_CATEGORIES.find((c) => c.value === fb.category)?.label || fb.category}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        fb.priority === "haute"
                          ? "bg-red-500/10 text-red-500"
                          : fb.priority === "moyenne"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {fb.priority}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        fb.status === "pris_en_compte"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : fb.status === "transmis"
                            ? "bg-blue-500/10 text-blue-500"
                            : "",
                      )}
                    >
                      {fb.status === "pris_en_compte"
                        ? "Pris en compte"
                        : fb.status === "transmis"
                          ? "Transmis"
                          : "Nouveau"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fb.feedback}
                  </p>
                </div>
                {fb.status !== "pris_en_compte" && (
                  <Select
                    value={fb.status}
                    onValueChange={(v) => handleFbStatusChange(fb.id, v)}
                  >
                    <SelectTrigger className="h-7 w-[120px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nouveau">Nouveau</SelectItem>
                      <SelectItem value="transmis">Transmis</SelectItem>
                      <SelectItem value="pris_en_compte">Pris en compte</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
          ))}
          {feedbacks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun feedback pour le moment
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
