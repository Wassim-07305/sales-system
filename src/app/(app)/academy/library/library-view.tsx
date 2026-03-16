"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import type { ResourceItem } from "@/lib/types/database";
import {
  FileText,
  Video,
  Headphones,
  Code,
  Search,
  Download,
  ExternalLink,
  Library,
} from "lucide-react";

interface LibraryViewProps {
  resources: ResourceItem[];
}

const TYPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    ring: string;
  }
> = {
  pdf: {
    label: "PDF",
    icon: FileText,
    color: "text-red-500",
    bg: "bg-red-500/10",
    ring: "ring-red-500/20",
  },
  video: {
    label: "Vidéo",
    icon: Video,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    ring: "ring-blue-500/20",
  },
  audio: {
    label: "Audio",
    icon: Headphones,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    ring: "ring-purple-500/20",
  },
  script: {
    label: "Script",
    icon: Code,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    ring: "ring-amber-500/20",
  },
};

function getTypeConfig(type: string) {
  return (
    TYPE_CONFIG[type] || {
      label: type,
      icon: FileText,
      color: "text-muted-foreground",
      bg: "bg-muted/50",
      ring: "ring-border/50",
    }
  );
}

const TAB_OPTIONS = [
  { value: "all", label: "Tous" },
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Vidéo" },
  { value: "audio", label: "Audio" },
  { value: "script", label: "Scripts" },
];

export function LibraryView({ resources }: LibraryViewProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredResources = useMemo(() => {
    let filtered = resources;
    if (activeTab !== "all")
      filtered = filtered.filter((r) => r.resource_type === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return filtered;
  }, [resources, activeTab, search]);

  return (
    <div>
      <PageHeader
        title="Bibliothèque"
        description="Toutes vos ressources en un seul endroit"
      />

      <div className="space-y-6">
        {/* Filter tabs and search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                  activeTab === tab.value
                    ? "bg-brand text-brand-dark shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une ressource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Resource grid */}
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredResources.map((resource) => {
              const config = getTypeConfig(resource.resource_type);
              const Icon = config.icon;

              return (
                <Card
                  key={resource.id}
                  className="group rounded-2xl hover:shadow-lg hover:shadow-brand/5 hover:-translate-y-0.5 transition-all duration-300 border-border/40"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center ring-1 shrink-0",
                          config.bg,
                          config.ring,
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[13px] truncate">
                          {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-medium border",
                          config.bg,
                          config.color,
                        )}
                      >
                        {config.label}
                      </Badge>
                      {resource.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {resource.category}
                        </Badge>
                      )}
                    </div>

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {resource.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/60">
                            +{resource.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-2 h-8 text-xs"
                        >
                          {resource.resource_type === "video" ||
                          resource.resource_type === "audio" ? (
                            <>
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ouvrir
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              Télécharger
                            </>
                          )}
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
              <Library className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-sm">Aucune ressource trouvée</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search.trim()
                ? "Essayez avec d'autres termes de recherche"
                : "Aucune ressource disponible pour le moment"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
