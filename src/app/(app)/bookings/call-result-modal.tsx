"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { CALL_RESULT_OPTIONS } from "@/lib/constants";
import type { Booking, CallResultType } from "@/lib/types/database";
import { saveCallResult } from "@/lib/actions/booking-pages";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface CallResultModalProps {
  booking: Booking | null;
  onClose: () => void;
}

export function CallResultModal({ booking, onClose }: CallResultModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [callResult, setCallResult] = useState<string>("");
  const [objections, setObjections] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");

  function handleSubmit() {
    if (!booking) return;
    if (!callResult) {
      toast.error("Veuillez sélectionner un résultat d'appel");
      return;
    }

    startTransition(async () => {
      const result = await saveCallResult(booking.id, {
        call_result: callResult,
        objections: objections || undefined,
        follow_up_notes: followUpNotes || undefined,
        follow_up_date:
          callResult === "suivi_prevu" ? followUpDate || undefined : undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Résultat enregistré");
      onClose();
      setCallResult("");
      setObjections("");
      setFollowUpNotes("");
      setFollowUpDate("");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={!!booking}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          setCallResult("");
          setObjections("");
          setFollowUpNotes("");
          setFollowUpDate("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Résultat du call</DialogTitle>
          {booking && (
            <p className="text-sm text-muted-foreground">
              {booking.prospect_name} &middot;{" "}
              {format(new Date(booking.scheduled_at), "d MMM yyyy à HH:mm", {
                locale: fr,
              })}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Result grid */}
          <div>
            <Label className="mb-2 block text-sm font-medium">
              Résultat de l&apos;appel
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CALL_RESULT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setCallResult(option.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                    callResult === option.value
                      ? cn(
                          option.color,
                          "border-transparent ring-2 ring-primary/20 shadow-sm",
                        )
                      : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground hover:shadow-sm",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Objections */}
          <div>
            <Label className="mb-2 block text-sm font-medium">Objections</Label>
            <Textarea
              value={objections}
              onChange={(e) => setObjections(e.target.value)}
              placeholder="Objections rencontrées lors de l'appel..."
              rows={2}
            />
          </div>

          {/* Follow-up notes */}
          <div>
            <Label className="mb-2 block text-sm font-medium">
              Notes de suivi
            </Label>
            <Textarea
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="Prochaines étapes, remarques..."
              rows={2}
            />
          </div>

          {/* Follow-up date */}
          {callResult === "suivi_prevu" && (
            <div>
              <Label className="mb-2 block text-sm font-medium">
                Date de suivi
              </Label>
              <Input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="bg-emerald-500 text-black hover:bg-emerald-400"
              onClick={handleSubmit}
              disabled={!callResult || isPending}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Enregistrer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
