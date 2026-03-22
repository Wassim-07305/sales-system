"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  StickyNote,
  Phone,
  Mail,
  Users,
  CheckSquare,
  Loader2,
  X,
} from "lucide-react";
import { addQuickNote, getRecentDeals, searchDeals } from "@/lib/actions/crm";

type NoteType = "note" | "call" | "email" | "meeting" | "task";

interface Deal {
  id: string;
  title: string;
  value: number | null;
  contact: { full_name: string | null } | { full_name: string | null }[] | null;
}

function getContactName(contact: Deal["contact"]): string | null {
  if (!contact) return null;
  if (Array.isArray(contact)) {
    return contact[0]?.full_name || null;
  }
  return contact.full_name;
}

const NOTE_TYPES: {
  value: NoteType;
  label: string;
  icon: typeof StickyNote;
}[] = [
  { value: "note", label: "Note", icon: StickyNote },
  { value: "call", label: "Appel", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Reunion", icon: Users },
  { value: "task", label: "Tache", icon: CheckSquare },
];

interface QuickNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDealId?: string;
  defaultDealTitle?: string;
}

export function QuickNoteModal({
  open,
  onOpenChange,
  defaultDealId,
  defaultDealTitle,
}: QuickNoteModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"select" | "write">(
    defaultDealId ? "write" : "select",
  );
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(
    defaultDealId && defaultDealTitle
      ? {
          id: defaultDealId,
          title: defaultDealTitle,
          value: null,
          contact: null,
        }
      : null,
  );
  const [deals, setDeals] = useState<Deal[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("note");
  const [content, setContent] = useState("");

  // Load recent deals when modal opens
  useEffect(() => {
    if (open && step === "select") {
      startTransition(async () => {
        const data = await getRecentDeals(10);
        setDeals(data as Deal[]);
      });
    }
  }, [open, step]);

  // Search deals when query changes
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const data = await searchDeals(searchQuery);
        setDeals(data as Deal[]);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  function handleSelectDeal(deal: Deal) {
    setSelectedDeal(deal);
    setStep("write");
  }

  function handleSubmit() {
    if (!selectedDeal || !content.trim()) {
      toast.error("Veuillez sélectionner un deal et écrire une note");
      return;
    }

    startTransition(async () => {
      const result = await addQuickNote({
        dealId: selectedDeal.id,
        content: content.trim(),
        type: noteType,
      });

      if (result.success) {
        toast.success("Note ajoutee avec succes");
        onOpenChange(false);
        resetState();
        router.refresh();
      } else {
        toast.error(result.error || "Erreur lors de l'ajout de la note");
      }
    });
  }

  function resetState() {
    setStep(defaultDealId ? "write" : "select");
    setSelectedDeal(
      defaultDealId && defaultDealTitle
        ? {
            id: defaultDealId,
            title: defaultDealTitle,
            value: null,
            contact: null,
          }
        : null,
    );
    setSearchQuery("");
    setNoteType("note");
    setContent("");
  }

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  }

  const Icon = NOTE_TYPES.find((t) => t.value === noteType)?.icon || StickyNote;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-emerald-500" />
            {step === "select"
              ? "Sélectionner un deal"
              : "Ajouter une note rapide"}
          </DialogTitle>
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-4">
            <Command className="rounded-lg border">
              <CommandInput
                placeholder="Rechercher un deal..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isPending ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : deals.length === 0 ? (
                  <CommandEmpty>Aucun deal trouve</CommandEmpty>
                ) : (
                  <CommandGroup heading="Deals recents">
                    {deals.map((deal) => (
                      <CommandItem
                        key={deal.id}
                        value={deal.title}
                        onSelect={() => handleSelectDeal(deal)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <p className="font-medium">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {getContactName(deal.contact) || "Aucun contact"}
                            </p>
                          </div>
                          {deal.value && (
                            <Badge variant="outline">
                              {deal.value.toLocaleString("fr-FR")} EUR
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected deal */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <p className="font-medium">{selectedDeal?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedDeal?.contact
                    ? getContactName(selectedDeal.contact)
                    : null) || "Deal sélectionné"}
                </p>
              </div>
              {!defaultDealId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("select")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Note type selector */}
            <div className="flex flex-wrap gap-2">
              {NOTE_TYPES.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <Button
                    key={type.value}
                    variant={noteType === type.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteType(type.value)}
                    className={
                      noteType === type.value ? "bg-emerald-500 text-black" : ""
                    }
                  >
                    <TypeIcon className="h-3.5 w-3.5 mr-1.5" />
                    {type.label}
                  </Button>
                );
              })}
            </div>

            {/* Note content */}
            <Textarea
              placeholder="Écrivez votre note ici..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
              autoFocus
            />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isPending || !content.trim()}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <StickyNote className="h-4 w-4 mr-2" />
                )}
                Ajouter
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
