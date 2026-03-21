"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  GitBranch,
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  BarChart3,
  Sparkles,
  Copy,
  Check,
  Eye,
} from "lucide-react";
import { createFlowchart, generateAiFlowchart } from "@/lib/actions/scripts-v2";
import { toast } from "sonner";
import Link from "next/link";

interface Flowchart {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

const categoryColors: Record<string, string> = {
  prospection: "bg-foreground/10 text-foreground border-foreground/20",
  closing: "bg-brand/10 text-brand border-brand/20",
  objection:
    "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  relance: "bg-foreground/8 text-foreground/80 border-foreground/15",
  discovery: "bg-muted/60 text-muted-foreground border-border/50",
};

export function ScriptsView({ flowcharts }: { flowcharts: Flowchart[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scriptSearch, setScriptSearch] = useState("");
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [sheetFlowchart, setSheetFlowchart] = useState<Flowchart | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFlowcharts = flowcharts.filter((fc) => {
    const query = scriptSearch.toLowerCase();
    if (!query) return true;
    return (
      fc.title.toLowerCase().includes(query) ||
      (fc.category?.toLowerCase().includes(query) ?? false) ||
      (fc.description?.toLowerCase().includes(query) ?? false)
    );
  });

  function handleCreateFlowchart() {
    startTransition(async () => {
      try {
        const flowchart = await createFlowchart({
          title: "Nouveau flowchart",
        });
        router.push(`/scripts/flowchart/${flowchart.id}`);
      } catch {
        // Silently fail
      }
    });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function getPreviewLines(description: string | null): string {
    if (!description) return "";
    const lines = description.split("\n").filter((l) => l.trim() !== "");
    return lines.slice(0, 3).join("\n");
  }

  async function handleCopy(id: string, description: string | null) {
    if (!description) return;
    try {
      await navigator.clipboard.writeText(description);
      setCopiedId(id);
      toast.success("Script copié dans le presse-papiers");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Impossible de copier le script");
    }
  }

  return (
    <div>
      <PageHeader
        title="Scripts & Outils"
        description="Gérez vos scripts et flowcharts de vente"
      >
        <Button
          onClick={() => setShowAiDialog(true)}
          className="bg-brand text-brand-dark hover:bg-brand/90"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Générer avec l&apos;IA
        </Button>
        <Link href="/scripts/analytics">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytiques
          </Button>
        </Link>
        <Link href="/scripts/templates">
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue="scripts">
        <TabsList className="mb-6">
          <TabsTrigger value="scripts" className="gap-2">
            <FileText className="h-4 w-4" />
            Scripts
          </TabsTrigger>
          <TabsTrigger value="flowcharts" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Flowcharts
          </TabsTrigger>
        </TabsList>

        {/* Scripts Tab — flowcharts as text documents */}
        <TabsContent value="scripts">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un script..."
                value={scriptSearch}
                onChange={(e) => setScriptSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFlowcharts.map((fc) => (
              <Card
                key={fc.id}
                className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">
                      {fc.title}
                    </CardTitle>
                    {fc.is_template && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        Template
                      </Badge>
                    )}
                  </div>
                  {fc.category && (
                    <Badge
                      variant="outline"
                      className={
                        categoryColors[fc.category] ||
                        "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {fc.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {fc.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3 whitespace-pre-line">
                      {getPreviewLines(fc.description)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic mb-3">
                      Script non généré
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(fc.updated_at)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {fc.description && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopy(fc.id, fc.description)}
                          >
                            {copiedId === fc.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span className="ml-1">Copier</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSheetFlowchart(fc)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Voir le script
                          </Button>
                        </>
                      )}
                      <Link href={`/scripts/flowchart/${fc.id}`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Ouvrir
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredFlowcharts.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-7 w-7 opacity-50" />
                    </div>
                    <p className="font-medium">Aucun script trouvé</p>
                    <p className="text-sm mt-1">
                      {scriptSearch
                        ? "Essayez une autre recherche."
                        : "Générez votre premier script avec l'IA pour commencer."}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Flowcharts Tab */}
        <TabsContent value="flowcharts">
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleCreateFlowchart}
              disabled={isPending}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Nouveau flowchart
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flowcharts.map((fc) => (
              <Card
                key={fc.id}
                className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">
                      {fc.title}
                    </CardTitle>
                    {fc.is_template && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        Template
                      </Badge>
                    )}
                  </div>
                  {fc.category && (
                    <Badge
                      variant="outline"
                      className={
                        categoryColors[fc.category] ||
                        "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {fc.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {fc.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {fc.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(fc.updated_at)}
                    </span>
                    <Link href={`/scripts/flowchart/${fc.id}`}>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Ouvrir
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {flowcharts.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <GitBranch className="h-7 w-7 opacity-50" />
                    </div>
                    <p className="font-medium">Aucun flowchart</p>
                    <p className="text-sm mt-1">
                      Créez votre premier flowchart pour visualiser vos scripts
                      de vente.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheet pour voir le script complet */}
      <Sheet
        open={sheetFlowchart !== null}
        onOpenChange={(open) => {
          if (!open) setSheetFlowchart(null);
        }}
      >
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetFlowchart?.title}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {sheetFlowchart?.category && (
              <Badge
                variant="outline"
                className={
                  categoryColors[sheetFlowchart.category] ||
                  "bg-muted text-muted-foreground border-border"
                }
              >
                {sheetFlowchart.category}
              </Badge>
            )}
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-line text-sm text-foreground/90 leading-relaxed">
              {sheetFlowchart?.description || "Aucun contenu de script."}
            </div>
            <div className="flex gap-2 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopy(
                    sheetFlowchart?.id || "",
                    sheetFlowchart?.description || null,
                  )
                }
              >
                {copiedId === sheetFlowchart?.id ? (
                  <Check className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" />
                )}
                Copier le script
              </Button>
              <Link href={`/scripts/flowchart/${sheetFlowchart?.id}`}>
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Ouvrir le flowchart
                </Button>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <GenerateAiDialog open={showAiDialog} onOpenChange={setShowAiDialog} />
    </div>
  );
}

function GenerateAiDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [business, setBusiness] = useState("");
  const [method, setMethod] = useState("");
  const [network, setNetwork] = useState("");

  async function handleGenerate() {
    if (!business.trim()) {
      toast.error("Veuillez décrire le business du prospect.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await generateAiFlowchart({
        business: business.trim(),
        method: method.trim() || undefined,
        network: network || undefined,
        format: "flowchart",
      });

      toast.success("Script généré avec succès ! Redirection...");
      router.push(`/scripts/flowchart/${result.id}`);

      onOpenChange(false);
      setBusiness("");
      setMethod("");
      setNetwork("");
    } catch {
      toast.error("Erreur lors de la génération. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Générer un script avec l&apos;IA
          </DialogTitle>
          <DialogDescription>
            Décrivez le contexte et l&apos;IA créera un script de vente structuré.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ai-business">
              Business <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="ai-business"
              placeholder="Décrivez le business du prospect (secteur, offre, cible...)"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-method">Méthode de vente</Label>
            <Textarea
              id="ai-method"
              placeholder="Décrivez votre méthode de vente (optionnel)"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-network">Réseau</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger id="ai-network">
                <SelectValue placeholder="Sélectionnez un réseau (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telephone">Téléphone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Annuler
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !business.trim()}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {isGenerating ? "Génération en cours..." : "Générer avec l'IA"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
