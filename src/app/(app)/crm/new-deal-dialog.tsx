"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Deal, PipelineStage, DealTemperature } from "@/lib/types/database";
import { Plus, Loader2 } from "lucide-react";

interface NewDealDialogProps {
  stages: PipelineStage[];
  onDealCreated: (deal: Deal) => void;
}

export function NewDealDialog({ stages, onDealCreated }: NewDealDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id || "");
  const [temperature, setTemperature] = useState<DealTemperature>("warm");
  const [source, setSource] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title) return;

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("deals")
      .insert({
        title,
        value: parseFloat(value) || 0,
        stage_id: stageId,
        temperature,
        source: source || null,
      })
      .select("*, contact:profiles!deals_contact_id_fkey(*), assigned_user:profiles!deals_assigned_to_fkey(*)")
      .single();

    if (error) {
      toast.error("Erreur lors de la création du deal");
      setLoading(false);
      return;
    }

    onDealCreated(data);
    toast.success("Deal créé !");
    setOpen(false);
    setTitle("");
    setValue("");
    setSource("");
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-brand text-brand-dark hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau deal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre du deal</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Formation Closing - Jean D."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Valeur (€)</Label>
            <Input
              id="value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="3500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Température</Label>
              <Select
                value={temperature}
                onValueChange={(v) => setTemperature(v as DealTemperature)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner la source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="content">Contenu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer le deal
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
