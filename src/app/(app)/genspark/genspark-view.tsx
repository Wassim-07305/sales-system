"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { OutilsNav } from "@/components/layout/outils-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Sparkles,
  Presentation,
  Search,
  FolderOpen,
  Share2,
  Loader2,
} from "lucide-react";
import type {
  Presentation as PresentationType,
  PresentationTheme,
} from "@/lib/types/database";
import { createPresentation } from "@/lib/actions/genspark";
import { PresentationCard } from "@/components/genspark/presentation-card";
import { AiGenerateDialog } from "@/components/genspark/ai-generate-dialog";
import { ShareDialog } from "@/components/genspark/share-dialog";

interface GensparkViewProps {
  presentations: PresentationType[];
  templates: PresentationType[];
}

export function GensparkView({ presentations, templates }: GensparkViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [sharePresId, setSharePresId] = useState<string | null>(null);

  // Create dialog state
  const [newTitle, setNewTitle] = useState("");
  const [newTheme, setNewTheme] = useState<PresentationTheme>("dark");

  const filtered = presentations.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()),
  );

  function handleCreate() {
    if (!newTitle.trim()) {
      toast.error("Veuillez saisir un titre");
      return;
    }
    startTransition(async () => {
      try {
        const pres = await createPresentation({
          title: newTitle.trim(),
          theme: newTheme,
        });
        toast.success("Présentation créée");
        setShowCreateDialog(false);
        setNewTitle("");
        router.push(`/genspark/${pres.id}`);
      } catch {
        toast.error("Erreur lors de la création");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Outils"
        description="Scripts, flowcharts, présentations et automatisation"
      >
        <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle présentation
        </Button>
        <Button
          onClick={() => setShowAiDialog(true)}
          className="bg-emerald-500 text-black hover:bg-emerald-400"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Générer avec l&apos;IA
        </Button>
      </PageHeader>

      <OutilsNav active="presentation" />

      <Tabs defaultValue="presentations">
        <TabsList className="mb-6">
          <TabsTrigger value="presentations" className="gap-2">
            <Presentation className="h-4 w-4" />
            Mes présentations
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presentations">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une présentation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((pres) => (
              <PresentationCard
                key={pres.id}
                presentation={pres}
                onShare={(id) => setSharePresId(id)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Presentation className="h-7 w-7 opacity-50" />
                    </div>
                    <p className="font-medium">Aucune présentation</p>
                    <p className="text-sm mt-1">
                      {search
                        ? "Essayez une autre recherche."
                        : "Créez votre première présentation ou générez-en une avec l'IA."}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <PresentationCard key={tpl.id} presentation={tpl} />
            ))}
            {templates.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <FolderOpen className="h-7 w-7 opacity-50" />
                    </div>
                    <p className="font-medium">Aucun template disponible</p>
                    <p className="text-sm mt-1">
                      Les templates apparaîtront ici quand ils seront créés.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-500" />
              Nouvelle présentation
            </DialogTitle>
            <DialogDescription>
              Créez une présentation vide et ajoutez vos slides manuellement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pres-title">Titre</Label>
              <Input
                id="pres-title"
                placeholder="Ma présentation"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pres-theme">Thème</Label>
              <Select
                value={newTheme}
                onValueChange={(v) => setNewTheme(v as PresentationTheme)}
              >
                <SelectTrigger id="pres-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Sombre</SelectItem>
                  <SelectItem value="light">Clair</SelectItem>
                  <SelectItem value="brand">Brand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !newTitle.trim()}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <AiGenerateDialog open={showAiDialog} onOpenChange={setShowAiDialog} />

      {/* Share Dialog */}
      <ShareDialog
        presentationId={sharePresId || ""}
        isOpen={sharePresId !== null}
        onClose={() => setSharePresId(null)}
      />
    </div>
  );
}
