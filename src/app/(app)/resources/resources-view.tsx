"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Video,
  Download,
  Search,
  FolderOpen,
  FileSpreadsheet,
  Image,
  Headphones,
  File,
  ExternalLink,
} from "lucide-react";
import { incrementDownload } from "@/lib/actions/resources";
import { toast } from "sonner";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  file_type: string;
  file_url: string | null;
  file_size: number | null;
  thumbnail_url: string | null;
  download_count?: number;
  created_at: string;
}

interface Props {
  resources: Resource[];
  categories: string[];
}

function getFileIcon(fileType: string) {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return FileText;
    case "video":
    case "mp4":
    case "webm":
      return Video;
    case "xlsx":
    case "csv":
      return FileSpreadsheet;
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
      return Image;
    case "mp3":
    case "audio":
      return Headphones;
    default:
      return File;
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const categoryColors: Record<string, string> = {
  formation: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  scripts: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  templates: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  replays: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  outils: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export function ResourcesView({ resources, categories }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const displayResources = resources;
  const displayCategories =
    categories.length > 0
      ? categories
      : ([
          ...new Set(resources.map((r) => r.category).filter(Boolean)),
        ] as string[]);

  // Filter resources
  const filteredResources = displayResources.filter((resource) => {
    const matchesSearch =
      !search ||
      resource.title.toLowerCase().includes(search.toLowerCase()) ||
      resource.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      !selectedCategory || resource.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleDownload = (resource: Resource) => {
    startTransition(async () => {
      try {
        await incrementDownload(resource.id);
        if (resource.file_url) {
          window.open(resource.file_url, "_blank");
        }
      } catch {
        toast.error("Erreur lors du téléchargement");
      }
    });
  };

  return (
    <div>
      <PageHeader
        title="Ressources"
        description="Documents, replays et fichiers utiles pour votre réussite"
      />

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une ressource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className={
              selectedCategory === null
                ? "bg-emerald-500 text-black hover:bg-emerald-400"
                : ""
            }
          >
            Tous
          </Button>
          {displayCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSelectedCategory(
                  selectedCategory === category ? null : category,
                )
              }
              className={
                selectedCategory === category
                  ? "bg-emerald-500 text-black hover:bg-emerald-400"
                  : ""
              }
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Resources grid */}
      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              Aucune ressource trouvée
            </h3>
            <p className="text-sm text-muted-foreground">
              {search || selectedCategory
                ? "Essayez de modifier vos critères de recherche"
                : "Les ressources seront bientôt disponibles"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => {
            const Icon = getFileIcon(resource.file_type);
            const categoryColor =
              categoryColors[resource.category?.toLowerCase() || ""] ||
              "bg-muted text-muted-foreground border-border";

            return (
              <Card
                key={resource.id}
                className="group hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                      <Icon className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm leading-tight mb-1 line-clamp-2">
                        {resource.title}
                      </h3>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {resource.category && (
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${categoryColor}`}
                          >
                            {resource.category}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground uppercase">
                          {resource.file_type}
                        </span>
                        {resource.file_size && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatFileSize(resource.file_size)}
                          </span>
                        )}
                        {resource.download_count != null &&
                          resource.download_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {resource.download_count} téléchargement
                              {resource.download_count > 1 ? "s" : ""}
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    {resource.file_url ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <a
                            href={resource.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1.5" />
                            Ouvrir
                          </a>
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 text-black hover:bg-emerald-400"
                          onClick={() => handleDownload(resource)}
                        >
                          <Download className="h-4 w-4 mr-1.5" />
                          Télécharger
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        Bientôt disponible
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats footer */}
      <div className="mt-6 text-center text-sm text-muted-foreground">
        {filteredResources.length} ressource
        {filteredResources.length > 1 ? "s" : ""}{" "}
        {search || selectedCategory ? "trouvée" : "disponible"}
        {filteredResources.length > 1 ? "s" : ""}
      </div>
    </div>
  );
}
