"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Clock,
  MessageSquare,
  Zap,
  ArrowLeft,
  X,
} from "lucide-react";
import {
  createWhatsAppSequence,
  updateWhatsAppSequence,
  deleteWhatsAppSequence,
} from "@/lib/actions/whatsapp";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface SequenceStep {
  delay_minutes: number;
  message: string;
  media_url?: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  funnel_type: string | null;
  steps: SequenceStep[];
  is_active: boolean;
  created_at: string;
}

const funnelTypeLabels: Record<string, string> = {
  "post-optin": "Post Opt-in",
  "post-booking": "Post Booking",
  nurturing: "Nurturing",
};

const funnelTypeColors: Record<string, string> = {
  "post-optin": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "post-booking": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  nurturing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const emptyStep: SequenceStep = { delay_minutes: 0, message: "" };

export function SequencesView({ sequences }: { sequences: Sequence[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [funnelType, setFunnelType] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([{ ...emptyStep }]);

  function resetForm() {
    setName("");
    setDescription("");
    setFunnelType("");
    setSteps([{ ...emptyStep }]);
    setEditingSequence(null);
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(seq: Sequence) {
    setEditingSequence(seq);
    setName(seq.name);
    setDescription(seq.description || "");
    setFunnelType(seq.funnel_type || "");
    setSteps(
      seq.steps && seq.steps.length > 0
        ? seq.steps.map((s) => ({ ...s }))
        : [{ ...emptyStep }]
    );
    setDialogOpen(true);
  }

  function addStep() {
    setSteps([...steps, { ...emptyStep }]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(
    index: number,
    field: keyof SequenceStep,
    value: string | number
  ) {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (steps.some((s) => !s.message.trim())) {
      toast.error("Chaque étape doit contenir un message");
      return;
    }

    startTransition(async () => {
      try {
        const cleanSteps = steps.map((s) => ({
          delay_minutes: Number(s.delay_minutes) || 0,
          message: s.message,
          ...(s.media_url ? { media_url: s.media_url } : {}),
        }));

        if (editingSequence) {
          await updateWhatsAppSequence(editingSequence.id, {
            name,
            description: description || undefined,
            funnel_type: funnelType || undefined,
            steps: cleanSteps,
          });
          toast.success("Séquence mise à jour");
        } else {
          await createWhatsAppSequence({
            name,
            description: description || undefined,
            funnel_type: funnelType || undefined,
            steps: cleanSteps,
          });
          toast.success("Séquence créée");
        }
        setDialogOpen(false);
        resetForm();
        router.refresh();
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  }

  async function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteWhatsAppSequence(id);
        toast.success("Séquence supprimée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  }

  async function handleToggleActive(seq: Sequence) {
    startTransition(async () => {
      try {
        await updateWhatsAppSequence(seq.id, { is_active: !seq.is_active });
        router.refresh();
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Séquences WhatsApp"
        description="Créez des séquences de messages automatisées"
      >
        <div className="flex gap-2">
          <Link href="/whatsapp">
            <Button variant="outline" size="sm" className="rounded-xl font-medium">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Button
            onClick={openCreate}
            className="rounded-xl font-medium bg-brand text-brand-dark hover:bg-brand/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle séquence
          </Button>
        </div>
      </PageHeader>

      {/* Sequence List */}
      {sequences.length === 0 ? (
        <Card className="shadow-sm rounded-2xl border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Zap className="h-7 w-7 opacity-40" />
            </div>
            <p className="font-medium">Aucune séquence</p>
            <p className="text-sm mt-1">
              Créez votre première séquence de messages automatisés
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sequences.map((seq) => (
            <Card key={seq.id} className="shadow-sm rounded-2xl border-border/50 hover:shadow-md transition-all">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{seq.name}</h3>
                      {seq.funnel_type && (
                        <Badge
                          variant="outline"
                          className={
                            funnelTypeColors[seq.funnel_type] || ""
                          }
                        >
                          {funnelTypeLabels[seq.funnel_type] ||
                            seq.funnel_type}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          seq.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted/50 text-muted-foreground border-border/50"
                        }
                      >
                        {seq.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    {seq.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {seq.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {seq.steps?.length || 0} étapes
                      </span>
                      {seq.steps && seq.steps.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Durée totale :{" "}
                          {seq.steps.reduce(
                            (acc, s) => acc + (s.delay_minutes || 0),
                            0
                          )}{" "}
                          min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={seq.is_active}
                      onCheckedChange={() => handleToggleActive(seq)}
                      disabled={isPending}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(seq)}
                      disabled={isPending}
                      className="rounded-xl"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(seq.id)}
                      disabled={isPending}
                      className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sequence Builder Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSequence
                ? "Modifier la séquence"
                : "Nouvelle séquence"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <Label>Nom</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Séquence post opt-in"
                className="h-11 rounded-xl"
              />
            </div>

            {/* Description */}
            <div>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de la séquence..."
                rows={2}
                className="rounded-xl"
              />
            </div>

            {/* Funnel type */}
            <div>
              <Label>Type de funnel</Label>
              <Select value={funnelType} onValueChange={setFunnelType}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post-optin">Post Opt-in</SelectItem>
                  <SelectItem value="post-booking">Post Booking</SelectItem>
                  <SelectItem value="nurturing">Nurturing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Étapes</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  type="button"
                  className="rounded-xl font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter une étape
                </Button>
              </div>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <Card key={index} className="rounded-xl border-border/50">
                    <CardContent className="py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-1 pt-2 text-muted-foreground">
                          <GripVertical className="h-4 w-4" />
                          <span className="text-xs font-medium w-5 text-center">
                            {index + 1}
                          </span>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div>
                            <Label className="text-xs">
                              Délai (minutes)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={step.delay_minutes}
                              onChange={(e) =>
                                updateStep(
                                  index,
                                  "delay_minutes",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Message</Label>
                            <Textarea
                              value={step.message}
                              onChange={(e) =>
                                updateStep(index, "message", e.target.value)
                              }
                              placeholder="Contenu du message..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              URL média (optionnel)
                            </Label>
                            <Input
                              value={step.media_url || ""}
                              onChange={(e) =>
                                updateStep(
                                  index,
                                  "media_url",
                                  e.target.value
                                )
                              }
                              placeholder="https://..."
                              className="h-8"
                            />
                          </div>
                        </div>
                        {steps.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-1"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <Button
              onClick={handleSave}
              className="w-full rounded-xl font-medium bg-brand text-brand-dark hover:bg-brand/90"
              disabled={isPending}
            >
              {editingSequence ? "Mettre à jour" : "Créer la séquence"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
