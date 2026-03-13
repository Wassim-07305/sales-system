"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, UserCheck, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createProspect,
  updateProspectStatus,
  deleteProspect,
  type ProspectRow,
} from "@/lib/actions/prospects";
import { cn } from "@/lib/utils";

type Prospect = ProspectRow;

const STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  replied: "A répondu",
  booked: "RDV fixé",
  not_interested: "Pas intéressé",
};

const STATUS_CLASS: Record<string, string> = {
  new: "bg-muted text-muted-foreground",
  contacted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  replied: "bg-green-500/20 text-green-400 border-green-500/30",
  booked: "bg-[#7af17a]/20 text-[#7af17a] border-[#7af17a]/30",
  not_interested: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ProspectsView({
  prospects: initialProspects,
}: {
  prospects: Prospect[];
  userId: string;
  role: string;
}) {
  const [prospects, setProspects] = useState<Prospect[]>(initialProspects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setName("");
    setProfileUrl("");
    setPlatform("");
    setNotes("");
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    startTransition(async () => {
      try {
        await createProspect({
          name: name.trim(),
          profile_url: profileUrl || undefined,
          platform: platform || undefined,
          notes: notes || undefined,
        });
        const newProspect: Prospect = {
          id: crypto.randomUUID(),
          name: name.trim(),
          profile_url: profileUrl || null,
          platform: platform || null,
          status: "new",
          notes: notes || null,
          created_at: new Date().toISOString(),
          created_by: null,
          created_by_name: null,
          list: null,
        };
        setProspects((prev) => [newProspect, ...prev]);
        resetForm();
        setDialogOpen(false);
        toast.success("Prospect ajouté");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Erreur lors de la création"
        );
      }
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      try {
        await updateProspectStatus(id, status);
        setProspects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p))
        );
        toast.success("Statut mis à jour");
      } catch {
        toast.error("Erreur lors de la mise à jour");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce prospect ? Cette action est irréversible.")) return;
    startTransition(async () => {
      try {
        await deleteProspect(id);
        setProspects((prev) => prev.filter((p) => p.id !== id));
        toast.success("Prospect supprimé");
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  };

  const total = prospects.length;
  const contacted = prospects.filter((p) =>
    ["contacted", "replied", "booked"].includes(p.status)
  ).length;
  const booked = prospects.filter((p) => p.status === "booked").length;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Mes Prospects"
        description="Gérez vos prospects et leur statut"
      >
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau prospect
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-sm text-muted-foreground">Total prospects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-400">{contacted}</div>
            <div className="text-sm text-muted-foreground">Contactés</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-[#7af17a]">{booked}</div>
            <div className="text-sm text-muted-foreground">RDV fixés</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des prospects */}
      {prospects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <UserCheck className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">Aucun prospect pour l&apos;instant</p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur &quot;Nouveau prospect&quot; pour commencer
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {prospects.map((prospect) => (
            <Card key={prospect.id} className="relative">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">
                    {prospect.name}
                  </CardTitle>
                  <button
                    onClick={() => handleDelete(prospect.id)}
                    disabled={isPending}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {prospect.platform && (
                  <p className="text-xs text-muted-foreground">
                    {prospect.platform}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Badge statut */}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    STATUS_CLASS[prospect.status] ?? STATUS_CLASS.new
                  )}
                >
                  {STATUS_LABELS[prospect.status] ?? prospect.status}
                </span>

                {/* Notes */}
                {prospect.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {prospect.notes}
                  </p>
                )}

                {/* Lien profil */}
                {prospect.profile_url && (
                  <a
                    href={prospect.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Voir le profil
                  </a>
                )}

                {/* Changer le statut */}
                <div className="flex items-center gap-2">
                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <Select
                    value={prospect.status}
                    onValueChange={(val) =>
                      handleStatusChange(prospect.id, val)
                    }
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog nouveau prospect */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau prospect</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prospect-name">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input
                id="prospect-name"
                placeholder="Prénom Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-url">URL profil</Label>
              <Input
                id="prospect-url"
                placeholder="https://linkedin.com/in/..."
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-platform">Plateforme</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger id="prospect-platform">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prospect-notes">Notes</Label>
              <Textarea
                id="prospect-notes"
                placeholder="Notes sur ce prospect..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setDialogOpen(false);
              }}
            >
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={isPending}>
              {isPending ? "Création..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
