"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Copy, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createFlowchartFromTemplate } from "@/lib/actions/scripts-v2";

interface ScriptTemplate {
  id: string;
  title: string;
  category: string | null;
  niche: string | null;
  network: string | null;
  flowchart_data: Record<string, unknown>;
  content: string | null;
  is_public: boolean;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  prospection: "Prospection",
  closing: "Closing",
  objection: "Objection",
  relance: "Relance",
  discovery: "Découverte",
};

const categoryColors: Record<string, string> = {
  prospection: "bg-foreground/10 text-foreground border-foreground/20",
  closing: "bg-brand/10 text-brand border-brand/20",
  objection: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  relance: "bg-foreground/8 text-foreground/80 border-foreground/15",
  discovery: "bg-muted/60 text-muted-foreground border-border/50",
};

const networkLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  telephone: "Téléphone",
  email: "Email",
  whatsapp: "WhatsApp",
};

const networkColors: Record<string, string> = {
  linkedin: "bg-muted/60 text-muted-foreground border-border/50",
  instagram: "bg-muted/60 text-muted-foreground border-border/50",
  telephone: "bg-muted/60 text-muted-foreground border-border/50",
  email: "bg-muted/60 text-muted-foreground border-border/50",
  whatsapp: "bg-muted/60 text-muted-foreground border-border/50",
};

export function TemplatesView({ templates }: { templates: ScriptTemplate[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterNiche, setFilterNiche] = useState("all");
  const [filterNetwork, setFilterNetwork] = useState("all");
  const [isCreating, setIsCreating] = useState<string | null>(null);

  // Extract unique values for filters
  const uniqueNiches = Array.from(
    new Set(templates.map((t) => t.niche).filter(Boolean))
  ) as string[];
  const uniqueNetworks = Array.from(
    new Set(templates.map((t) => t.network).filter(Boolean))
  ) as string[];
  const uniqueCategories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean))
  ) as string[];

  const filtered = templates.filter((t) => {
    const query = search.toLowerCase();
    if (
      query &&
      !t.title.toLowerCase().includes(query) &&
      !(t.content?.toLowerCase().includes(query) ?? false)
    ) {
      return false;
    }
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterNiche !== "all" && t.niche !== filterNiche) return false;
    if (filterNetwork !== "all" && t.network !== filterNetwork) return false;
    return true;
  });

  async function handleUseTemplate(template: ScriptTemplate) {
    setIsCreating(template.id);
    try {
      const flowchart = await createFlowchartFromTemplate(template.id);
      toast.success(`Script "${flowchart.title}" créé avec succès`);
      router.push(`/scripts/flowchart/${flowchart.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la création"
      );
    } finally {
      setIsCreating(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates de Scripts"
        description="Modèles prêts à l'emploi"
      >
        <Link href="/scripts">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux scripts
          </Button>
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un template..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {uniqueCategories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {categoryLabels[cat] || cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterNiche} onValueChange={setFilterNiche}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Niche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes niches</SelectItem>
            {uniqueNiches.map((niche) => (
              <SelectItem key={niche} value={niche}>
                {niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterNetwork} onValueChange={setFilterNetwork}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Réseau" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous réseaux</SelectItem>
            {uniqueNetworks.map((network) => (
              <SelectItem key={network} value={network}>
                {networkLabels[network] || network}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => (
          <Card
            key={template.id}
            className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-brand/5 transition-all duration-300 flex flex-col"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base line-clamp-2">
                {template.title}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {template.category && (
                  <Badge
                    variant="outline"
                    className={
                      categoryColors[template.category] ||
                      "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {categoryLabels[template.category] || template.category}
                  </Badge>
                )}
                {template.niche && (
                  <Badge variant="secondary" className="text-xs">
                    {template.niche}
                  </Badge>
                )}
                {template.network && (
                  <Badge
                    variant="outline"
                    className={
                      networkColors[template.network] ||
                      "bg-muted text-muted-foreground border-border"
                    }
                  >
                    {networkLabels[template.network] || template.network}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {template.content && (
                <p className="text-sm text-muted-foreground line-clamp-4 mb-4 flex-1">
                  {template.content}
                </p>
              )}
              <Button
                onClick={() => handleUseTemplate(template)}
                variant="outline"
                size="sm"
                className="w-full mt-auto"
                disabled={isCreating === template.id}
              >
                {isCreating === template.id ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-2" />
                )}
                {isCreating === template.id ? "Création..." : "Utiliser ce template"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucun template trouvé</p>
                <p className="text-sm mt-1">
                  {search || filterCategory !== "all" || filterNiche !== "all" || filterNetwork !== "all"
                    ? "Essayez de modifier vos filtres."
                    : "Aucun template disponible pour le moment."}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
