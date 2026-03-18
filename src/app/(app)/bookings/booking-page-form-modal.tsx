"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { SLOT_DURATIONS } from "@/lib/constants";
import type { BookingPage } from "@/lib/types/database";
import {
  createBookingPage,
  updateBookingPage,
} from "@/lib/actions/booking-pages";
import { QualificationFieldEditor } from "./qualification-field-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface BookingPageFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: BookingPage;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function BookingPageFormModal({
  open,
  onOpenChange,
  page,
}: BookingPageFormModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = !!page;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#7af17a");
  const [slotDuration, setSlotDuration] = useState("30");
  const [bufferMinutes, setBufferMinutes] = useState("0");
  const [minNoticeHours, setMinNoticeHours] = useState("2");
  const [maxDaysAhead, setMaxDaysAhead] = useState("60");
  const [emailVisible, setEmailVisible] = useState(true);
  const [emailRequired, setEmailRequired] = useState(true);
  const [qualificationFields, setQualificationFields] = useState<
    Array<{
      id: string;
      label: string;
      type: "text" | "select" | "textarea" | "number";
      required: boolean;
      options?: string[];
    }>
  >([]);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setDescription(page.description || "");
      setBrandColor(page.brand_color);
      setSlotDuration(String(page.slot_duration));
      setBufferMinutes(String(page.buffer_minutes));
      setMinNoticeHours(String(page.min_notice_hours));
      setMaxDaysAhead(String(page.max_days_ahead));
      setEmailVisible(page.email_visible);
      setEmailRequired(page.email_required);
      setQualificationFields(page.qualification_fields || []);
    } else {
      setTitle("");
      setSlug("");
      setDescription("");
      setBrandColor("#7af17a");
      setSlotDuration("30");
      setBufferMinutes("0");
      setMinNoticeHours("2");
      setMaxDaysAhead("60");
      setEmailVisible(true);
      setEmailRequired(true);
      setQualificationFields([]);
    }
  }, [page, open]);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!isEdit) {
      setSlug(slugify(value));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !slug) {
      toast.error("Titre et slug requis");
      return;
    }

    startTransition(async () => {
      const params = {
        title,
        slug,
        description: description || undefined,
        brand_color: brandColor,
        slot_duration: parseInt(slotDuration),
        buffer_minutes: parseInt(bufferMinutes),
        min_notice_hours: parseInt(minNoticeHours),
        max_days_ahead: parseInt(maxDaysAhead),
        email_visible: emailVisible,
        email_required: emailRequired,
        qualification_fields: qualificationFields,
      };

      if (isEdit) {
        const result = await updateBookingPage(page.id, params);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Page mise à jour");
      } else {
        const result = await createBookingPage(params);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Page créée !");
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la page" : "Nouvelle page de booking"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Titre + Slug */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Titre
              </Label>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Appel découverte"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Slug (URL)
              </Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="appel-decouverte"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Description
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'objectif de cet appel..."
              rows={2}
            />
          </div>

          {/* Durée + Buffer + Couleur */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Durée du créneau
              </Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Buffer (min)
              </Label>
              <Input
                type="number"
                min={0}
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Couleur
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border border-border/50"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Préavis + Jours max */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Préavis minimum (heures)
              </Label>
              <Input
                type="number"
                min={0}
                value={minNoticeHours}
                onChange={(e) => setMinNoticeHours(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Jours max à l&apos;avance
              </Label>
              <Input
                type="number"
                min={1}
                value={maxDaysAhead}
                onChange={(e) => setMaxDaysAhead(e.target.value)}
              />
            </div>
          </div>

          {/* Email settings */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={emailVisible}
                onCheckedChange={setEmailVisible}
              />
              <Label className="text-sm">Email visible</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={emailRequired}
                onCheckedChange={setEmailRequired}
              />
              <Label className="text-sm">Email obligatoire</Label>
            </div>
          </div>

          {/* Qualification Fields */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Champs de qualification
            </Label>
            <QualificationFieldEditor
              fields={qualificationFields}
              onChange={setQualificationFields}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-brand text-brand-dark hover:bg-brand/90"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer la page"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
