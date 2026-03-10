"use client";

import { useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Deal, PipelineStage, DealTemperature } from "@/lib/types/database";
import {
  User,
  DollarSign,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import { updateDealStage, updateDealTemperature, updateDealNotes } from "@/lib/actions/crm";

interface DealPanelProps {
  deal: Deal;
  stages: PipelineStage[];
  onClose: () => void;
  onUpdate: (deal: Deal) => void;
}

const tempColors = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  cold: "bg-blue-100 text-blue-700",
};

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

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">{deal.title}</SheetTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/crm/${deal.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Voir detail
              </Link>
            </Button>
          </div>
        </SheetHeader>

        {/* Contact info */}
        {deal.contact && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
              {deal.contact.full_name?.charAt(0) || "?"}
            </div>
            <div>
              <p className="font-medium">{deal.contact.full_name}</p>
              <p className="text-sm text-muted-foreground">{deal.contact.email}</p>
            </div>
          </div>
        )}

        {/* Deal info */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs text-muted-foreground">Valeur</label>
            <div className="flex items-center gap-1 text-lg font-bold mt-1">
              <DollarSign className="h-4 w-4 text-brand" />
              {deal.value?.toLocaleString("fr-FR")} €
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Probabilité</label>
            <p className="text-lg font-bold mt-1">{deal.probability}%</p>
          </div>
        </div>

        {/* Stage */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">Stage</label>
          <Select value={deal.stage_id || ""} onValueChange={handleStageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Température
          </label>
          <div className="flex gap-2">
            {(["hot", "warm", "cold"] as const).map((temp) => (
              <Badge
                key={temp}
                variant="outline"
                className={`cursor-pointer ${
                  deal.temperature === temp
                    ? tempColors[temp]
                    : "opacity-40 hover:opacity-70"
                }`}
                onClick={() => handleTempChange(temp)}
              >
                {temp === "hot" ? "Hot" : temp === "warm" ? "Warm" : "Cold"}
              </Badge>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Quick actions */}
        <div className="flex gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              if (deal.contact?.phone) {
                window.open(`tel:${deal.contact.phone}`, "_self");
              } else {
                toast.error("Aucun numéro de téléphone");
              }
            }}
          >
            <Phone className="h-4 w-4 mr-1" />
            Appeler
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            asChild
          >
            <Link href={`/inbox?contact=${deal.contact?.id || ""}`}>
              <MessageSquare className="h-4 w-4 mr-1" />
              Message
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              if (deal.contact?.email) {
                window.open(`mailto:${deal.contact.email}?subject=Re: ${deal.title}`, "_blank");
              } else {
                toast.error("Aucune adresse email");
              }
            }}
          >
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
        </div>

        {/* Next action */}
        {deal.next_action && (
          <div className="mb-4 p-3 bg-brand/5 rounded-lg border border-brand/10">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              Prochaine action
            </div>
            <p className="text-sm font-medium">{deal.next_action}</p>
            {deal.next_action_date && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(deal.next_action_date).toLocaleDateString("fr-FR")}
              </p>
            )}
          </div>
        )}

        <Separator className="my-4" />

        {/* Notes */}
        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block">
            Notes
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ajouter des notes..."
            rows={4}
            className="mb-2"
          />
          <Button
            size="sm"
            onClick={saveNotes}
            disabled={saving}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
