"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type {
  Deal,
  PipelineStage,
  DealTemperature,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Phone,
  MessageSquare,
  Mail,
  Clock,
  ExternalLink,
  Flame,
  Thermometer,
  Snowflake,
  Percent,
  Send,
  ArrowRight,
  CalendarPlus,
  FileText,
  User,
  History,
} from "lucide-react";
import {
  updateDealStage,
  updateDealTemperature,
  addDealActivity,
  getDealActivities,
  getTeamMembers,
  updateDeal,
} from "@/lib/actions/crm";

interface Activity {
  id: string;
  type: string;
  content: string;
  created_at: string;
  user?: { full_name: string | null } | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
}

interface DealPanelProps {
  deal: Deal;
  stages: PipelineStage[];
  onClose: () => void;
  onUpdate: (deal: Deal) => void;
}

const TEMP_CONFIG = {
  hot: {
    icon: Flame,
    color: "text-foreground",
    bg: "bg-foreground/10",
    border: "border-foreground/20",
    label: "Chaud",
  },
  warm: {
    icon: Thermometer,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border/50",
    label: "Tiède",
  },
  cold: {
    icon: Snowflake,
    color: "text-muted-foreground/60",
    bg: "bg-muted/40",
    border: "border-border/30",
    label: "Froid",
  },
};

const AVATAR_COLORS = [
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function DealPanel({ deal, stages, onClose, onUpdate }: DealPanelProps) {
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const loadActivities = useCallback(async () => {
    const data = await getDealActivities(deal.id);
    setActivities(data as Activity[]);
    setLoadingActivities(false);
  }, [deal.id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadActivities();
    getTeamMembers().then(setTeamMembers);
  }, [loadActivities]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleStageChange(stageId: string) {
    const result = await updateDealStage(deal.id, stageId);
    if (result.error) {
      toast.error("Erreur");
      return;
    }
    onUpdate({ ...deal, stage_id: stageId });
    toast.success("Stage mis à jour");
  }

  async function handleTempChange(temp: DealTemperature) {
    const result = await updateDealTemperature(deal.id, temp);
    if (result.error) {
      toast.error("Erreur");
      return;
    }
    onUpdate({ ...deal, temperature: temp });
  }

  async function handleAssignChange(userId: string) {
    const result = await updateDeal(deal.id, { assigned_to: userId });
    if (result.error) {
      toast.error("Erreur");
      return;
    }
    onUpdate({ ...deal, assigned_to: userId } as Deal);
    toast.success("Setter assigné mis à jour");
  }

  async function addNote() {
    if (!noteText.trim()) return;
    setSaving(true);
    const result = await addDealActivity(deal.id, "note", noteText.trim());
    if (result.error) {
      toast.error("Erreur");
    } else {
      setNoteText("");
      await loadActivities();
      toast.success("Note ajoutée");
    }
    setSaving(false);
  }

  const currentStage = stages.find((s) => s.id === deal.stage_id);

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4">
          <SheetHeader className="p-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="text-lg font-bold truncate">
                  {deal.title}
                </SheetTitle>
                {currentStage && (
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: currentStage.color }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {currentStage.name}
                    </span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={`/crm/${deal.id}`}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Détail
                </Link>
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Contact card */}
          {deal.contact && (
            <div className="flex items-center gap-3 p-3.5 bg-muted/30 rounded-xl border border-border/50">
              <div
                className={cn(
                  "h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0",
                  getAvatarColor(
                    deal.contact.id || deal.contact.full_name || "",
                  ),
                )}
              >
                {deal.contact.full_name
                  ?.split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {deal.contact.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {deal.contact.email}
                </p>
              </div>
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[11px] text-muted-foreground">
                  Valeur
                </span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {deal.value?.toLocaleString("fr-FR")} €
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Percent className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[11px] text-muted-foreground">
                  Probabilité
                </span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {deal.probability}%
              </p>
              <div className="w-full bg-emerald-500/10 rounded-full h-1 mt-2">
                <div
                  className="bg-emerald-500/50 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${deal.probability || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stage selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Stage du pipeline
            </label>
            <Select
              value={deal.stage_id || ""}
              onValueChange={handleStageChange}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Sélectionner un stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature selector */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Température
            </label>
            <div className="flex gap-2">
              {(["hot", "warm", "cold"] as const).map((temp) => {
                const cfg = TEMP_CONFIG[temp];
                const TempIcon = cfg.icon;
                const isActive = deal.temperature === temp;
                return (
                  <button
                    key={temp}
                    onClick={() => handleTempChange(temp)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-sm font-medium transition-all duration-200",
                      isActive
                        ? cn(cfg.bg, cfg.border, cfg.color)
                        : "border-border/50 text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    <TempIcon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Setter assigné */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Assigné à
            </label>
            <Select
              value={
                ((deal as unknown as Record<string, unknown>)
                  .assigned_to as string) || ""
              }
              onValueChange={handleAssignChange}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Sélectionner un membre" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>{member.full_name || "Sans nom"}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        ({member.role})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick actions */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Actions rapides
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deal.contact?.phone ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1.5"
                  asChild
                >
                  <a href={`tel:${deal.contact.phone}`}>
                    <Phone className="h-3.5 w-3.5" />
                    Appeler
                  </a>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 gap-1.5"
                  onClick={() => toast.error("Aucun numéro de téléphone")}
                >
                  <Phone className="h-3.5 w-3.5" />
                  Appeler
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                asChild
              >
                <Link href={`/chat?contact=${deal.contact?.id || ""}`}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                onClick={() => {
                  if (deal.contact?.email) {
                    window.open(
                      `mailto:${deal.contact.email}?subject=Re: ${deal.title}`,
                      "_blank",
                    );
                  } else {
                    toast.error("Aucune adresse email");
                  }
                }}
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                asChild
              >
                <Link
                  href={`/bookings/new?contactId=${deal.contact?.id || ""}&dealId=${deal.id}`}
                >
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Booker un appel
                </Link>
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-10 gap-1.5 mt-2 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              asChild
            >
              <Link
                href={`/contracts/new?dealId=${deal.id}&clientId=${deal.contact?.id || ""}&amount=${deal.value}`}
              >
                <FileText className="h-3.5 w-3.5" />
                Générer un contrat
              </Link>
            </Button>
          </div>

          {/* Next action */}
          {deal.next_action && (
            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Prochaine action
                </span>
              </div>
              <p className="text-sm font-medium">{deal.next_action}</p>
              {deal.next_action_date && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {new Date(deal.next_action_date).toLocaleDateString(
                      "fr-FR",
                      {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                      },
                    )}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes — journal chronologique */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Historique des notes
            </label>
            <div className="flex gap-2 mb-3">
              <Input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Ajouter une note..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addNote();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={addNote}
                disabled={saving || !noteText.trim()}
                className="bg-emerald-500 text-black hover:bg-emerald-400 gap-1.5 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {loadingActivities ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Chargement...
                </p>
              ) : activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucune note pour le moment
                </p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="p-2.5 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <p className="text-sm">{activity.content}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </span>
                      {activity.user?.full_name && (
                        <span className="text-[10px] text-muted-foreground">
                          — {activity.user.full_name}
                        </span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                        {activity.type === "note"
                          ? "note"
                          : activity.type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
