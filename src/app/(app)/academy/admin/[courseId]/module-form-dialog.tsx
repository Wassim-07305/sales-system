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

import { createModule, updateModule } from "@/lib/actions/academy-admin";

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  module?: { id: string; title: string; description: string | null } | null;
  onSaved: (module: {
    id: string;
    title: string;
    description: string | null;
  }) => void;
}

export function ModuleFormDialog({
  open,
  onOpenChange,
  courseId,
  module,
  onSaved,
}: ModuleFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const isEditing = !!module;

  // Reset le formulaire quand le dialog s'ouvre
  useEffect(() => {
    if (open) {
      setTitle(module?.title || "");
      setDescription(module?.description || "");
    }
  }, [open, module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && module) {
        await updateModule(module.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
        onSaved({
          id: module.id,
          title: title.trim(),
          description: description.trim() || null,
        });
        toast.success("Module mis a jour");
      } else {
        const newId = await createModule({
          course_id: courseId,
          title: title.trim(),
          description: description.trim() || undefined,
        });
        if (newId) {
          onSaved({
            id: newId,
            title: title.trim(),
            description: description.trim() || null,
          });
          toast.success("Module cree");
        }
      }
      onOpenChange(false);
    } catch {
      toast.error(
        isEditing
          ? "Erreur lors de la mise a jour du module"
          : "Erreur lors de la creation du module",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le module" : "Nouveau module"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mod-title">Titre</Label>
            <Input
              id="mod-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Introduction au closing"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mod-description">Description (optionnelle)</Label>
            <Textarea
              id="mod-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Decrivez le contenu de ce module..."
              rows={3}
            />
          </div>

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
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
