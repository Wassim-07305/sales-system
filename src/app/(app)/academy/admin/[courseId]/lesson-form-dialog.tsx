"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { createLesson } from "@/lib/actions/academy-admin";

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  moduleId: string;
  onSaved: (lesson: {
    id: string;
    title: string;
    description: string | null;
    module_id: string;
  }) => void;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  courseId,
  moduleId,
  onSaved,
}: LessonFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }

    setSaving(true);
    try {
      const newId = await createLesson({
        course_id: courseId,
        module_id: moduleId,
        title: title.trim(),
        description: description.trim() || undefined,
      });

      if (newId) {
        onSaved({
          id: newId,
          title: title.trim(),
          description: description.trim() || null,
          module_id: moduleId,
        });
        toast.success("Lecon creee");
      }
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la creation de la lecon");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle lecon</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Titre</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Les techniques de decouverte"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-description">Description (optionnelle)</Label>
            <Textarea
              id="lesson-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Decrivez le contenu de cette lecon..."
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            La video et les pieces jointes peuvent etre ajoutees apres la creation
            depuis le panneau d&apos;edition.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim()}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Creer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
