"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  saveOnboardingStep,
  deleteOnboardingStep,
} from "@/lib/actions/onboarding";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ArrowLeft,
  ListChecks,
} from "lucide-react";
import Link from "next/link";

interface Step {
  id: string;
  title: string;
  description: string | null;
  position: number;
  step_type: string;
  content: Record<string, unknown>;
  is_required: boolean;
}

export function OnboardingSettings({ steps }: { steps: Step[] }) {
  const router = useRouter();
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepType, setStepType] = useState("action");
  const [isRequired, setIsRequired] = useState(true);

  function openEdit(step: Step) {
    setEditingStep(step);
    setTitle(step.title);
    setDescription(step.description || "");
    setStepType(step.step_type);
    setIsRequired(step.is_required);
    setDialogOpen(true);
  }

  function openNew() {
    setEditingStep(null);
    setTitle("");
    setDescription("");
    setStepType("action");
    setIsRequired(true);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    try {
      await saveOnboardingStep({
        id: editingStep?.id,
        title,
        description,
        position: editingStep?.position || steps.length + 1,
        step_type: stepType,
        content: editingStep?.content || {},
        is_required: isRequired,
      });
      toast.success(editingStep ? "Étape modifiée" : "Étape ajoutée");
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  }

  async function handleDelete(stepId: string) {
    if (!confirm("Supprimer cette étape ?")) return;
    try {
      await deleteOnboardingStep(stepId);
      toast.success("Étape supprimée");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <div>
      <PageHeader
        title="Étapes d'onboarding"
        description="Configurez le parcours d'intégration des nouveaux clients"
      >
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-emerald-500 text-black hover:bg-emerald-400"
            onClick={openNew}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </PageHeader>

      <div className="space-y-3">
        {steps.map((step) => (
          <Card
            key={step.id}
            className="border-border/50 hover:shadow-md transition-all"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <GripVertical className="h-5 w-5 text-muted-foreground/40 shrink-0 cursor-grab" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/50 px-2 py-0.5 rounded">
                    {step.position}
                  </span>
                  <h4 className="font-medium text-sm truncate">{step.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    {step.step_type}
                  </Badge>
                  {step.is_required && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      Obligatoire
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-muted/50"
                  onClick={() => openEdit(step)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-red-500/10"
                  onClick={() => handleDelete(step.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {steps.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <ListChecks className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-sm text-foreground mb-1">
                Aucune étape configurée
              </p>
              <p className="text-xs text-muted-foreground">
                Cliquez sur &quot;Ajouter&quot; pour commencer.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Modifier l'étape" : "Nouvelle étape"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Titre
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Bienvenue"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'étape"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </Label>
              <Select value={stepType} onValueChange={setStepType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Vidéo</SelectItem>
                  <SelectItem value="questionnaire">Questionnaire</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="required">Étape obligatoire</Label>
            </div>
            <Button
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
              onClick={handleSave}
            >
              {editingStep ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
