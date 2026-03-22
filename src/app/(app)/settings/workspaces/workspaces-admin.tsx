"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createEntrepreneurAccount } from "@/lib/actions/workspace";
import {
  Plus,
  Building2,
  Users,
  FileText,
  ArrowLeft,
  Search,
  Mail,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Workspace {
  id: string;
  full_name: string | null;
  email: string;
  company: string | null;
  onboarding_completed: boolean;
  onboarding_step: number | null;
  created_at: string;
  updated_at: string;
  setters: Array<{ id: string; full_name: string | null; email: string }>;
  contracts: { count: number; signed: number };
}

export function WorkspacesAdmin({ workspaces }: { workspaces: Workspace[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // New entrepreneur form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");

  const filtered = workspaces.filter((w) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (w.full_name || "").toLowerCase().includes(q) ||
      w.email.toLowerCase().includes(q) ||
      (w.company || "").toLowerCase().includes(q)
    );
  });

  async function handleCreate() {
    if (!newEmail.trim()) {
      toast.error("L'email est obligatoire");
      return;
    }
    setCreating(true);
    try {
      const result = await createEntrepreneurAccount({
        email: newEmail.trim(),
        fullName: newName.trim() || undefined,
        company: newCompany.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Compte entrepreneur créé — invitation envoyée");
      setDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewCompany("");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Workspaces B2B"
        description="Gérez les espaces entrepreneurs et leurs équipes de setters"
      >
        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Link href="/settings/workspaces/esops">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              ESOPs
            </Button>
          </Link>
          <Button
            size="sm"
            className="bg-emerald-500 text-black hover:bg-emerald-400"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer un entrepreneur
          </Button>
        </div>
      </PageHeader>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou entreprise..."
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{workspaces.length}</p>
              <p className="text-xs text-muted-foreground">Entrepreneurs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {workspaces.reduce((sum, w) => sum + w.setters.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Setters assignés</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {workspaces.reduce((sum, w) => sum + w.contracts.signed, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Contrats signés</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspace cards */}
      <div className="space-y-3">
        {filtered.map((w) => (
          <Card
            key={w.id}
            className="border-border/50 hover:shadow-md transition-all"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0",
                    w.onboarding_completed ? "bg-zinc-700" : "bg-amber-600",
                  )}
                >
                  {(w.company || w.full_name || w.email)
                    .substring(0, 2)
                    .toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">
                      {w.company || w.full_name || w.email}
                    </h4>
                    {w.onboarding_completed ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-500/10 text-green-600 border-green-500/20"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Actif
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        Onboarding
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {w.full_name ? `${w.full_name} — ` : ""}
                    {w.email}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {w.setters.length} setter
                      {w.setters.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {w.contracts.signed}/{w.contracts.count} contrats
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Créé{" "}
                      {formatDistanceToNow(new Date(w.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>

                  {/* Setters list */}
                  {w.setters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {w.setters.map((s) => (
                        <Badge key={s.id} variant="outline" className="text-xs">
                          {s.full_name || s.email}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/settings/workspaces/${w.id}/sops`}>
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      SOPs
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/team/assignments`}>
                      <Users className="h-3.5 w-3.5 mr-1" />
                      Setters
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <Card className="border-border/50">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <Building2 className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="font-medium text-sm text-foreground mb-1">
                {search ? "Aucun résultat" : "Aucun entrepreneur B2B"}
              </p>
              <p className="text-xs text-muted-foreground">
                {search
                  ? "Essayez un autre terme de recherche"
                  : 'Cliquez sur "Créer un entrepreneur" pour commencer.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create entrepreneur dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un compte entrepreneur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Email *
              </Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="entrepreneur@email.com"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Nom complet
              </Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Entreprise
              </Label>
              <Input
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Mon Entreprise SAS"
              />
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span>
                  Un email d&apos;invitation sera envoyé avec un lien de
                  création de mot de passe.
                </span>
              </div>
            </div>
            <Button
              className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              {creating ? "Création..." : "Créer le compte"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
