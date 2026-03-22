"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { createBooking } from "@/lib/actions/bookings";
import { useRouter } from "next/navigation";

export function NewBookingDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("30");
  const [slotType, setSlotType] = useState("decouverte");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prospectName || !scheduledAt) return;

    startTransition(async () => {
      const result = await createBooking({
        prospect_name: prospectName,
        prospect_email: prospectEmail || undefined,
        prospect_phone: prospectPhone || undefined,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: parseInt(duration),
        slot_type: slotType,
        notes: notes || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Rendez-vous créé !");
      setOpen(false);
      resetForm();
      router.refresh();
    });
  }

  function resetForm() {
    setProspectName("");
    setProspectEmail("");
    setProspectPhone("");
    setScheduledAt("");
    setDuration("30");
    setSlotType("decouverte");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-500 text-black hover:bg-emerald-400">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau RDV
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Programmer un rendez-vous</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prospect_name">Nom du prospect *</Label>
            <Input
              id="prospect_name"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              placeholder="Jean Dupont"
              required
              className="h-11 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prospect_email">Email</Label>
              <Input
                id="prospect_email"
                type="email"
                value={prospectEmail}
                onChange={(e) => setProspectEmail(e.target.value)}
                placeholder="jean@example.com"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prospect_phone">Téléphone</Label>
              <Input
                id="prospect_phone"
                value={prospectPhone}
                onChange={(e) => setProspectPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="h-11 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_at">Date et heure *</Label>
              <Input
                id="scheduled_at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Durée</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 heure</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type de RDV</Label>
            <Select value={slotType} onValueChange={setSlotType}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="decouverte">Appel découverte</SelectItem>
                <SelectItem value="closing">Appel closing</SelectItem>
                <SelectItem value="suivi">Suivi client</SelectItem>
                <SelectItem value="demo">Démo produit</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte du rendez-vous..."
              rows={2}
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-500 text-black hover:bg-emerald-400 h-11 rounded-xl"
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Programmer le RDV
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
