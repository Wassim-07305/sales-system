"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Video,
  Download,
  Search,
  Link as LinkIcon,
  Image,
  File,
  ExternalLink,
} from "lucide-react";
import { incrementDownload } from "@/lib/actions/resources";
import { toast } from "sonner";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  url: string;
  category: string | null;
  tags: string[];
  target_roles: string[];
  download_count: number;
  created_at: string;
}

const typeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  video: Video,
  image: Image,
  link: LinkIcon,
  document: FileText,
};

function getTypeIcon(type: string) {
  return typeIcons[type] || File;
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    pdf: "PDF",
    video: "Vidéo",
    image: "Image",
    link: "Lien",
    document: "Document",
  };
  return labels[type] || type.toUpperCase();
}

export function ResourcesView({
  resources,
  categories,
}: {
  resources: Resource[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [, startTransition] = useTransition();

  const filtered = resources.filter((r) => {
    const matchSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.description?.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchCategory =
      activeCategory === "all" || r.category === activeCategory;
    return matchSearch && matchCategory;
  });

  const handleDownload = (resource: Resource) => {
    startTransition(async () => {
      try {
        await incrementDownload(resource.id);
        window.open(resource.url, "_blank");
      } catch {
        toast.error("Erreur lors du téléchargement");
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Ressources"
        description="Documents, replays et fichiers utiles"
      />

      <div className="space-y-4">
        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ressource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres catégories */}
        {categories.length > 0 && (
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Liste */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucune ressource trouvée</p>
              <p className="text-sm mt-1">
                {search
                  ? "Essayez avec d'autres mots-clés"
                  : "Aucune ressource disponible pour le moment"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((resource) => {
              const Icon = getTypeIcon(resource.resource_type);
              return (
                <Card key={resource.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-brand" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {resource.title}
                        </p>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(resource.resource_type)}
                          </Badge>
                          {resource.category && (
                            <Badge variant="outline" className="text-xs">
                              {resource.category}
                            </Badge>
                          )}
                          {resource.download_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {resource.download_count} téléchargement
                              {resource.download_count > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(resource)}
                      className="shrink-0"
                    >
                      {resource.resource_type === "link" ? (
                        <>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ouvrir
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-1" />
                          Télécharger
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
