"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  GitBranch,
  Brain,
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Calendar,
  Tag,
  BarChart3,
} from "lucide-react";
import {
  createFlowchart,
  createMindMap,
} from "@/lib/actions/scripts-v2";
import Link from "next/link";

interface Script {
  id: string;
  title: string;
  category: string | null;
  niche: string | null;
  content: string;
  tags: string[];
  created_at: string;
}

interface Flowchart {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

interface MindMapItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

const categoryColors: Record<string, string> = {
  prospection: "bg-foreground/10 text-foreground border-foreground/20",
  closing: "bg-brand/10 text-brand border-brand/20",
  objection: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  relance: "bg-foreground/8 text-foreground/80 border-foreground/15",
  discovery: "bg-muted/60 text-muted-foreground border-border/50",
};

export function ScriptsView({
  scripts,
  flowcharts,
  mindMaps,
}: {
  scripts: Script[];
  flowcharts: Flowchart[];
  mindMaps: MindMapItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scriptSearch, setScriptSearch] = useState("");

  const filteredScripts = scripts.filter((s) => {
    const query = scriptSearch.toLowerCase();
    if (!query) return true;
    return (
      s.title.toLowerCase().includes(query) ||
      (s.category?.toLowerCase().includes(query) ?? false) ||
      (s.niche?.toLowerCase().includes(query) ?? false) ||
      s.tags?.some((t) => t.toLowerCase().includes(query))
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

  function handleCreateMindMap() {
    startTransition(async () => {
      try {
        const mindMap = await createMindMap({
          title: "Nouvelle mind map",
        });
        router.push(`/scripts/mindmap/${mindMap.id}`);
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

  return (
    <div>
      <PageHeader
        title="Scripts & Outils"
        description="Gérez vos scripts, flowcharts et mind maps"
      >
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
          <TabsTrigger value="mindmaps" className="gap-2">
            <Brain className="h-4 w-4" />
            Mind Maps
          </TabsTrigger>
        </TabsList>

        {/* Scripts Tab */}
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
            {filteredScripts.map((script) => (
              <Card
                key={script.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base line-clamp-1">
                      {script.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {script.category && (
                      <Badge
                        variant="outline"
                        className={
                          categoryColors[script.category] ||
                          "bg-muted text-muted-foreground border-border"
                        }
                      >
                        {script.category}
                      </Badge>
                    )}
                    {script.niche && (
                      <Badge variant="secondary" className="text-xs">
                        {script.niche}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                    {script.content}
                  </p>
                  {script.tags && script.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {script.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {script.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{script.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredScripts.length === 0 && (
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
                        : "Aucun script disponible pour le moment."}
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
                className="hover:shadow-md transition-shadow"
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

        {/* Mind Maps Tab */}
        <TabsContent value="mindmaps">
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleCreateMindMap}
              disabled={isPending}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Nouvelle mind map
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mindMaps.map((mm) => (
              <Card
                key={mm.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base line-clamp-1">
                    {mm.title}
                  </CardTitle>
                  {mm.category && (
                    <Badge
                      variant="outline"
                      className={
                        categoryColors[mm.category] ||
                        "bg-muted text-muted-foreground border-border"
                      }
                    >
                      {mm.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {mm.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {mm.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(mm.updated_at)}
                    </span>
                    <Link href={`/scripts/mindmap/${mm.id}`}>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        Ouvrir
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
            {mindMaps.length === 0 && (
              <div className="col-span-full">
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Brain className="h-7 w-7 opacity-50" />
                    </div>
                    <p className="font-medium">Aucune mind map</p>
                    <p className="text-sm mt-1">
                      Créez votre première mind map pour organiser vos idées.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
