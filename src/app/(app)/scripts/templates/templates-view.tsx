"use client";

import { useState } from "react";
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
import { FileText, Search, Copy, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  prospection: "bg-blue-100 text-blue-700",
  closing: "bg-green-100 text-green-700",
  objection: "bg-red-100 text-red-700",
  relance: "bg-orange-100 text-orange-700",
  discovery: "bg-purple-100 text-purple-700",
};

const networkLabels: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  telephone: "Téléphone",
  email: "Email",
  whatsapp: "WhatsApp",
};

const networkColors: Record<string, string> = {
  linkedin: "bg-[#0077b5]/10 text-[#0077b5]",
  instagram: "bg-[#e4405f]/10 text-[#e4405f]",
  telephone: "bg-gray-100 text-gray-700",
  email: "bg-amber-100 text-amber-700",
  whatsapp: "bg-[#25d366]/10 text-[#25d366]",
};

export function TemplatesView({ templates }: { templates: ScriptTemplate[] }) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterNiche, setFilterNiche] = useState("all");
  const [filterNetwork, setFilterNetwork] = useState("all");

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

  function handleUseTemplate(template: ScriptTemplate) {
    alert(
      `Template "${template.title}" sélectionné. Cette fonctionnalité sera bientôt disponible.`
    );
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
            className="hover:shadow-md transition-shadow flex flex-col"
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
                      "bg-gray-100 text-gray-700"
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
                      "bg-gray-100 text-gray-700"
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
              >
                <Copy className="h-3.5 w-3.5 mr-2" />
                Utiliser ce template
              </Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
