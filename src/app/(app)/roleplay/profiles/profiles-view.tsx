"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Linkedin,
  Instagram,
  User,
} from "lucide-react";
import {
  createRoleplayProfile,
  deleteRoleplayProfile,
} from "@/lib/actions/roleplay";
import { toast } from "sonner";
import Link from "next/link";

interface Profile {
  id: string;
  name: string;
  niche: string;
  persona: string;
  difficulty: string;
  objections: string[];
  scenario: string;
  network: string;
}

interface Props {
  profiles: Profile[];
}

const difficultyColors: Record<string, string> = {
  Facile: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Moyen: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Difficile: "bg-red-500/10 text-red-600 border-red-500/20",
};

const emptyForm = {
  name: "",
  niche: "",
  persona: "",
  difficulty: "Moyen",
  objections: "",
  scenario: "",
  network: "LinkedIn",
};

export function ProfilesView({ profiles }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditingProfile(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(profile: Profile) {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      niche: profile.niche,
      persona: profile.persona,
      difficulty: profile.difficulty,
      objections: (profile.objections || []).join(", "),
      scenario: profile.scenario || "",
      network: profile.network || "LinkedIn",
    });
    setDialogOpen(true);
  }

  function openDelete(id: string) {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.niche.trim()) {
      toast.error("Le nom et la niche sont requis");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        niche: form.niche.trim(),
        persona: form.persona.trim(),
        difficulty: form.difficulty,
        objections: form.objections
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        scenario: form.scenario.trim(),
        network: form.network,
      };

      if (editingProfile) {
        // For edit, we delete and re-create (simple approach without update action)
        await deleteRoleplayProfile(editingProfile.id);
        await createRoleplayProfile(payload);
        toast.success("Profil mis \u00e0 jour");
      } else {
        await createRoleplayProfile(payload);
        toast.success("Profil cr\u00e9\u00e9");
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await deleteRoleplayProfile(deletingId);
      toast.success("Profil supprim\u00e9");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  return (
    <div>
      <PageHeader
        title="Profils Prospects"
        description="G\u00e9rez les profils de prospects pour le jeu de r\u00f4les"
      >
        <div className="flex gap-2">
          <Link href="/roleplay">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Button
            onClick={openNew}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un profil
          </Button>
        </div>
      </PageHeader>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <User className="h-7 w-7 opacity-50" />
            </div>
            <p className="font-medium">Aucun profil prospect</p>
            <p className="text-sm mt-1">
              Cr\u00e9ez votre premier profil pour d\u00e9marrer les sessions de jeu de r\u00f4les.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Niche</TableHead>
                <TableHead>Difficult\u00e9</TableHead>
                <TableHead>R\u00e9seau</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">{profile.name}</TableCell>
                  <TableCell>{profile.niche}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${difficultyColors[profile.difficulty] || ""} text-[10px]`}
                    >
                      {profile.difficulty}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      {profile.network === "LinkedIn" ? (
                        <Linkedin className="h-3.5 w-3.5" />
                      ) : (
                        <Instagram className="h-3.5 w-3.5" />
                      )}
                      {profile.network}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(profile)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => openDelete(profile.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? "Modifier le profil" : "Nouveau profil prospect"}
            </DialogTitle>
            <DialogDescription>
              {editingProfile
                ? "Modifiez les informations du profil prospect."
                : "Configurez un nouveau profil de prospect pour les sessions de jeu de r\u00f4les."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du prospect</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Sophie Martin"
              />
            </div>
            <div>
              <Label>Niche</Label>
              <Input
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                placeholder="Ex: Coach fitness, E-commerce, SaaS..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Difficult\u00e9</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) => setForm({ ...form, difficulty: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Facile">Facile</SelectItem>
                    <SelectItem value="Moyen">Moyen</SelectItem>
                    <SelectItem value="Difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>R\u00e9seau</Label>
                <Select
                  value={form.network}
                  onValueChange={(v) => setForm({ ...form, network: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Persona / Description</Label>
              <Textarea
                value={form.persona}
                onChange={(e) => setForm({ ...form, persona: e.target.value })}
                rows={3}
                placeholder="D\u00e9crivez la personnalit\u00e9 et le comportement du prospect..."
              />
            </div>
            <div>
              <Label>Sc\u00e9nario</Label>
              <Textarea
                value={form.scenario}
                onChange={(e) => setForm({ ...form, scenario: e.target.value })}
                rows={2}
                placeholder="Contexte de la conversation..."
              />
            </div>
            <div>
              <Label>Objections (s\u00e9par\u00e9es par des virgules)</Label>
              <Input
                value={form.objections}
                onChange={(e) =>
                  setForm({ ...form, objections: e.target.value })
                }
                placeholder="Prix trop \u00e9lev\u00e9, Pas le temps, D\u00e9j\u00e0 essay\u00e9..."
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {saving
                ? "Enregistrement..."
                : editingProfile
                  ? "Mettre \u00e0 jour"
                  : "Cr\u00e9er le profil"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le profil</DialogTitle>
            <DialogDescription>
              \u00cates-vous s\u00fbr de vouloir supprimer ce profil ? Cette action est
              irr\u00e9versible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
