"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
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
  { label: string; icon: React.ElementType; color: string }
> = {
  pdf: { label: "PDF", icon: FileText, color: "text-red-500" },
  video: { label: "Video", icon: Video, color: "text-blue-500" },
  audio: { label: "Audio", icon: Headphones, color: "text-purple-500" },
  script: { label: "Script", icon: Code, color: "text-amber-500" },
};

function getTypeConfig(type: string) {
  return (
    TYPE_CONFIG[type] || {
      label: type,
      icon: FileText,
      color: "text-muted-foreground",
    }
  );
}

export function LibraryView({ resources }: LibraryViewProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredResources = useMemo(() => {
    let filtered = resources;

    if (activeTab !== "all") {
      filtered = filtered.filter((r) => r.resource_type === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q) ||
          r.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return filtered;
  }, [resources, activeTab, search]);

  return (
    <div>
      <PageHeader
        title="Bibliotheque"
        description="Toutes vos ressources en un seul endroit"
      />

      <div className="space-y-6">
        {/* Filter tabs and search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="video">Video</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="script">Scripts</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une ressource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Resource grid */}
        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => {
              const config = getTypeConfig(resource.resource_type);
              const Icon = config.icon;

              return (
                <Card
                  key={resource.id}
                  className="group hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-muted p-2.5 shrink-0">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {resource.title}
                        </h3>
                        {resource.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {resource.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {config.label}
                      </Badge>
                      {resource.category && (
                        <Badge variant="outline" className="text-xs">
                          {resource.category}
                        </Badge>
                      )}
                    </div>

                    {resource.tags && resource.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {resource.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {resource.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
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
                          className="w-full gap-2"
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
                              Telecharger
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
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Library className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              {search.trim()
                ? "Aucune ressource ne correspond a votre recherche"
                : "Aucune ressource disponible pour le moment"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
