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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import {
  createCourse,
  updateCourse,
} from "@/lib/actions/academy-admin";

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
}

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: CourseData;
  onSaved: () => void;
}

export function CourseFormDialog({
  open,
  onOpenChange,
  course,
  onSaved,
}: CourseFormDialogProps) {
  const isEdit = !!course;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reinitialiser le formulaire quand le dialog s'ouvre ou le cours change
  useEffect(() => {
    if (open) {
      setTitle(course?.title ?? "");
      setDescription(course?.description ?? "");
      setThumbnailUrl(course?.thumbnail_url ?? null);
      setIsPublished(course?.is_published ?? false);
    }
  }, [open, course]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }

    setLoading(true);

    try {
      if (isEdit && course) {
        await updateCourse(course.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          thumbnail_url: thumbnailUrl ?? undefined,
          is_published: isPublished,
        });
        toast.success("Formation mise a jour");
      } else {
        await createCourse({
          title: title.trim(),
          description: description.trim() || undefined,
          is_published: isPublished,
        });
        toast.success("Formation creee");
      }

      onSaved();
    } catch {
      toast.error(
        isEdit
          ? "Erreur lors de la mise a jour"
          : "Erreur lors de la creation"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la formation" : "Nouvelle formation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="course-title">Titre *</Label>
            <Input
              id="course-title"
              placeholder="Ex: Techniques de closing avancees"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="course-description">Description</Label>
            <Textarea
              id="course-description"
              placeholder="Decrivez le contenu et les objectifs de la formation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Miniature */}
          <div className="space-y-2">
            <Label>Miniature</Label>
            <FileUpload
              bucket="academy"
              path="thumbnails"
              accept="image/*"
              maxSize={5}
              currentUrl={thumbnailUrl}
              preview
              label="Glissez une image ou cliquez pour selectionner"
              onUpload={(url) => setThumbnailUrl(url)}
              onRemove={() => setThumbnailUrl(null)}
            />
          </div>

          {/* Publication */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="course-published" className="cursor-pointer">
                Publier la formation
              </Label>
              <p className="text-xs text-muted-foreground">
                Les formations publiees sont visibles par les apprenants
              </p>
            </div>
            <Switch
              id="course-published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
