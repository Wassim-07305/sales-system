"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  Save,
  ArrowRight,
  CalendarPlus,
} from "lucide-react";
import {
  updateDealStage,
  updateDealTemperature,
  updateDealNotes,
} from "@/lib/actions/crm";

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
    label: "Hot",
  },
  warm: {
    icon: Thermometer,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border/50",
    label: "Warm",
  },
  cold: {
    icon: Snowflake,
    color: "text-muted-foreground/60",
    bg: "bg-muted/40",
    border: "border-border/30",
    label: "Cold",
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
  const [notes, setNotes] = useState(deal.notes || "");
  const [saving, setSaving] = useState(false);

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

  async function saveNotes() {
    setSaving(true);
    const result = await updateDealNotes(deal.id, notes);
    if (result.error) {
      toast.error("Erreur");
    } else {
      onUpdate({ ...deal, notes });
      toast.success("Notes enregistrées");
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
            <div className="p-3.5 rounded-xl bg-brand/5 border border-brand/10">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-brand" />
                <span className="text-[11px] text-muted-foreground">
                  Valeur
                </span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {deal.value?.toLocaleString("fr-FR")} €
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-brand/5 border border-brand/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Percent className="h-3.5 w-3.5 text-brand" />
                <span className="text-[11px] text-muted-foreground">
                  Probabilité
                </span>
              </div>
              <p className="text-xl font-bold tabular-nums">
                {deal.probability}%
              </p>
              <div className="w-full bg-brand/10 rounded-full h-1 mt-2">
                <div
                  className="bg-brand/50 h-1 rounded-full transition-all duration-300"
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

          {/* Quick actions */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Actions rapides
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5"
                onClick={() => {
                  if (deal.contact?.phone) {
                    window.open(`tel:${deal.contact.phone}`, "_self");
                  } else {
                    toast.error("Aucun numéro de téléphone");
                  }
                }}
              >
                <Phone className="h-3.5 w-3.5" />
                Appeler
              </Button>
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
          </div>

          {/* Next action */}
          {deal.next_action && (
            <div className="p-4 bg-brand/5 rounded-xl border border-brand/10">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-md bg-brand/10 flex items-center justify-center">
                  <ArrowRight className="h-3.5 w-3.5 text-brand" />
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

          {/* Notes */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des notes sur ce deal..."
              rows={4}
              className="mb-3 resize-none"
            />
            <Button
              size="sm"
              onClick={saveNotes}
              disabled={saving || notes === (deal.notes || "")}
              className="bg-brand text-brand-dark hover:bg-brand/90 gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
