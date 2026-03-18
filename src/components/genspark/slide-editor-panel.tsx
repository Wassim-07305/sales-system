"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Plus, Trash2 } from "lucide-react";
import type {
  PresentationSlide,
  SlideLayout,
  SlideContent,
  SlideTransition,
} from "@/lib/types/database";
import { updateSlide, regenerateSlide } from "@/lib/actions/genspark";
import { LayoutPicker } from "./layout-picker";

interface SlideEditorPanelProps {
  slide: PresentationSlide;
  onSlideUpdate: (slide: PresentationSlide) => void;
}

// Fields to show for each layout
const layoutFields: Record<SlideLayout, (keyof SlideContent)[]> = {
  title: ["title", "subtitle"],
  title_content: ["title", "body"],
  bullets: ["title", "bullets"],
  two_columns: ["title", "column_left", "column_right"],
  image_left: ["image_url", "title", "body"],
  image_right: ["title", "body", "image_url"],
  image_full: ["image_url", "title"],
  quote: ["quote", "quote_author"],
  chart: ["title", "chart_type"],
  section: ["title"],
  blank: [],
};

const fieldLabels: Record<string, string> = {
  title: "Titre",
  subtitle: "Sous-titre",
  body: "Contenu",
  bullets: "Points clés",
  image_url: "URL de l'image",
  quote: "Citation",
  quote_author: "Auteur",
  chart_type: "Type de graphique",
  column_left: "Colonne gauche",
  column_right: "Colonne droite",
};

export function SlideEditorPanel({
  slide,
  onSlideUpdate,
}: SlideEditorPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [aiInstruction, setAiInstruction] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fields = layoutFields[slide.layout] || [];

  function handleFieldChange(field: keyof SlideContent, value: unknown) {
    const newContent = { ...slide.content, [field]: value };
    const newSlide = { ...slide, content: newContent };
    onSlideUpdate(newSlide);

    // Debounced save
    startTransition(async () => {
      try {
        await updateSlide(slide.id, { content: newContent });
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  }

  function handleLayoutChange(layout: SlideLayout) {
    const newSlide = { ...slide, layout };
    onSlideUpdate(newSlide);
    startTransition(async () => {
      try {
        await updateSlide(slide.id, { layout });
      } catch {
        toast.error("Erreur lors du changement de layout");
      }
    });
  }

  function handleTransitionChange(transition: SlideTransition) {
    const newSlide = { ...slide, transition };
    onSlideUpdate(newSlide);
    startTransition(async () => {
      try {
        await updateSlide(slide.id, { transition });
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  }

  function handleNotesChange(notes: string) {
    const newSlide = { ...slide, notes };
    onSlideUpdate(newSlide);
    startTransition(async () => {
      try {
        await updateSlide(slide.id, { notes });
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  }

  async function handleRegenerate() {
    if (!aiInstruction.trim()) {
      toast.error("Décrivez ce que vous voulez modifier");
      return;
    }
    setIsRegenerating(true);
    try {
      const updated = await regenerateSlide(slide.id, aiInstruction.trim());
      if (updated) {
        onSlideUpdate(updated);
        toast.success("Slide régénéré");
        setAiInstruction("");
      }
    } catch {
      toast.error("Erreur lors de la régénération");
    } finally {
      setIsRegenerating(false);
    }
  }

  // Bullets management
  function addBullet() {
    const bullets = [...(slide.content.bullets || []), ""];
    handleFieldChange("bullets", bullets);
  }

  function updateBullet(index: number, value: string) {
    const bullets = [...(slide.content.bullets || [])];
    bullets[index] = value;
    handleFieldChange("bullets", bullets);
  }

  function removeBullet(index: number) {
    const bullets = (slide.content.bullets || []).filter((_, i) => i !== index);
    handleFieldChange("bullets", bullets);
  }

  return (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {/* Layout picker */}
      <div className="space-y-2">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Layout
        </Label>
        <LayoutPicker value={slide.layout} onChange={handleLayoutChange} />
      </div>

      <Separator />

      {/* Content fields */}
      <div className="space-y-3">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Contenu
        </Label>

        {fields.map((field) => {
          if (field === "bullets") {
            return (
              <div key="bullets" className="space-y-2">
                <Label className="text-xs">{fieldLabels.bullets}</Label>
                {(slide.content.bullets || []).map((bullet, i) => (
                  <div key={i} className="flex gap-1.5">
                    <Input
                      value={bullet}
                      onChange={(e) => updateBullet(i, e.target.value)}
                      placeholder={`Point ${i + 1}`}
                      className="text-xs h-8"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => removeBullet(i)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addBullet}
                  className="w-full h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Ajouter un point
                </Button>
              </div>
            );
          }

          if (field === "chart_type") {
            return (
              <div key="chart_type" className="space-y-1.5">
                <Label className="text-xs">{fieldLabels.chart_type}</Label>
                <Select
                  value={(slide.content.chart_type as string) || "bar"}
                  onValueChange={(v) => handleFieldChange("chart_type", v)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Barres</SelectItem>
                    <SelectItem value="line">Courbe</SelectItem>
                    <SelectItem value="pie">Camembert</SelectItem>
                    <SelectItem value="area">Aire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          }

          const isLong = [
            "body",
            "column_left",
            "column_right",
            "quote",
          ].includes(field);

          return (
            <div key={field} className="space-y-1.5">
              <Label className="text-xs">{fieldLabels[field] || field}</Label>
              {isLong ? (
                <Textarea
                  value={(slide.content[field] as string) || ""}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={fieldLabels[field]}
                  rows={3}
                  className="text-xs"
                />
              ) : (
                <Input
                  value={(slide.content[field] as string) || ""}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  placeholder={fieldLabels[field]}
                  className="text-xs h-8"
                />
              )}
            </div>
          );
        })}
      </div>

      <Separator />

      {/* Transition */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Transition
        </Label>
        <Select
          value={slide.transition}
          onValueChange={(v) => handleTransitionChange(v as SlideTransition)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fade">Fondu</SelectItem>
            <SelectItem value="slide">Glissement</SelectItem>
            <SelectItem value="zoom">Zoom</SelectItem>
            <SelectItem value="none">Aucune</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Notes du présentateur
        </Label>
        <Textarea
          value={slide.notes || ""}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Notes visibles uniquement par vous..."
          rows={3}
          className="text-xs"
        />
      </div>

      <Separator />

      {/* AI Regenerate */}
      <div className="space-y-2">
        <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Régénérer avec l&apos;IA
        </Label>
        <Textarea
          value={aiInstruction}
          onChange={(e) => setAiInstruction(e.target.value)}
          placeholder="Ex: Rends le titre plus percutant et ajoute des statistiques..."
          rows={2}
          className="text-xs"
        />
        <Button
          onClick={handleRegenerate}
          disabled={isRegenerating || !aiInstruction.trim()}
          className="w-full bg-brand text-brand-dark hover:bg-brand/90"
          size="sm"
        >
          {isRegenerating ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          {isRegenerating ? "Régénération..." : "Régénérer ce slide"}
        </Button>
      </div>

      {/* Save indicator */}
      {isPending && (
        <p className="text-[10px] text-muted-foreground text-center animate-pulse">
          Sauvegarde en cours...
        </p>
      )}
    </div>
  );
}
