"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Map,
  ThumbsUp,
  Lightbulb,
  Rocket,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Send,
  Loader2,
  Sparkles,
  Tag,
  CalendarDays,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { voteForFeature, suggestFeature } from "@/lib/actions/roadmap";
import { cn } from "@/lib/utils";

// ─── Types (local, not exported from server actions) ──────────────────

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "planned" | "in_progress" | "done";
  votes: number;
  votedByUser: boolean;
  createdAt: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  votes: number;
  votedByUser: boolean;
  authorName: string;
  createdAt: string;
}

interface ReleaseChange {
  type: "feature" | "improvement" | "fix";
  text: string;
}

interface ReleaseNote {
  id: string;
  version: string;
  date: string;
  title: string;
  changes: ReleaseChange[];
}

interface RoadmapViewProps {
  roadmapItems: RoadmapItem[];
  suggestions: Suggestion[];
  releaseNotes: ReleaseNote[];
}

// ─── Category colors ─────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  Intégration: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Mobile: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Analytics: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Développeur: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  CRM: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  IA: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  Communication: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  Dashboard: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Gamification: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  Support: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  Formation: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  Outils: "bg-lime-500/10 text-lime-600 border-lime-500/20",
  Finance: "bg-green-500/10 text-green-600 border-green-500/20",
  Social: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  Interface: "bg-sky-500/10 text-sky-600 border-sky-500/20",
};

const SUGGESTION_CATEGORIES = [
  "CRM",
  "Communication",
  "Intégration",
  "IA",
  "Mobile",
  "Analytics",
  "Interface",
  "Formation",
  "Autre",
];

const STATUS_CONFIG = {
  planned: {
    label: "Planifié",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "En cours",
    icon: Rocket,
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
    dot: "bg-amber-500",
  },
  done: {
    label: "Terminé",
    icon: CheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
};

// ── Feature card ────────────────────────────────────────────────────
function FeatureCard({
  item,
  showStatus = false,
  onVote,
  voting,
}: {
  item: RoadmapItem;
  showStatus?: boolean;
  onVote: (featureId: string) => void;
  voting: boolean;
}) {
  const config = STATUS_CONFIG[item.status];
  const categoryColor =
    CATEGORY_COLORS[item.category] ||
    "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return (
    <Card className="bg-card/60 border-border/50 hover:shadow-md hover:border-border transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-white leading-tight">
              {item.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {item.description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVote(item.id)}
            disabled={voting}
            className={cn(
              "flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 shrink-0 rounded-lg transition-colors",
              item.votedByUser
                ? "bg-[#7af17a]/15 text-[#7af17a] hover:bg-[#7af17a]/25"
                : "hover:bg-white/5 text-muted-foreground hover:text-white",
            )}
          >
            <ThumbsUp
              className={cn("h-3.5 w-3.5", item.votedByUser && "fill-current")}
            />
            <span className="text-xs font-medium">{item.votes}</span>
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-[10px] px-1.5 py-0", categoryColor)}
          >
            {item.category}
          </Badge>
          {showStatus && (
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", config.bg, config.color)}
            >
              <config.icon className="h-2.5 w-2.5 mr-1" />
              {config.label}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Status column ───────────────────────────────────────────────────
function StatusColumn({
  status,
  items,
  onVote,
  voting,
}: {
  status: "planned" | "in_progress" | "done";
  items: RoadmapItem[];
  onVote: (featureId: string) => void;
  voting: boolean;
}) {
  const config = STATUS_CONFIG[status];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
        <h2 className={cn("font-semibold text-sm", config.color)}>
          {config.label}
        </h2>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 border-border text-muted-foreground"
        >
          {items.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <FeatureCard
            key={item.id}
            item={item}
            onVote={onVote}
            voting={voting}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────

export function RoadmapView({
  roadmapItems,
  suggestions,
  releaseNotes,
}: RoadmapViewProps) {
  const [activeTab, setActiveTab] = useState("roadmap");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"votes" | "date">("votes");
  const [isPending, startTransition] = useTransition();

  // Suggestion form
  const [sugTitle, setSugTitle] = useState("");
  const [sugDescription, setSugDescription] = useState("");
  const [sugCategory, setSugCategory] = useState("CRM");

  // ── Filtered & sorted roadmap items ─────────────────────────────────
  const filteredItems = useMemo(() => {
    let items = [...roadmapItems];
    if (statusFilter !== "all") {
      items = items.filter((i) => i.status === statusFilter);
    }
    if (sortBy === "votes") {
      items.sort((a, b) => b.votes - a.votes);
    } else {
      items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return items;
  }, [roadmapItems, statusFilter, sortBy]);

  // ── Grouped by status for column view ───────────────────────────────
  const grouped = useMemo(() => {
    const sorted = [...roadmapItems].sort((a, b) => b.votes - a.votes);
    return {
      planned: sorted.filter((i) => i.status === "planned"),
      in_progress: sorted.filter((i) => i.status === "in_progress"),
      done: sorted.filter((i) => i.status === "done"),
    };
  }, [roadmapItems]);

  // ── Sorted suggestions ──────────────────────────────────────────────
  const sortedSuggestions = useMemo(() => {
    return [...suggestions].sort((a, b) => b.votes - a.votes);
  }, [suggestions]);

  // ── Vote handler ────────────────────────────────────────────────────
  function handleVote(featureId: string) {
    startTransition(async () => {
      try {
        await voteForFeature(featureId);
        toast.success("Vote enregistré !", {
          style: { background: "#14080e", border: "1px solid #7af17a33" },
        });
      } catch {
        toast.error("Erreur lors du vote", {
          style: { background: "#14080e", border: "1px solid #ef444433" },
        });
      }
    });
  }

  // ── Suggest handler ─────────────────────────────────────────────────
  function handleSuggest() {
    if (!sugTitle.trim() || !sugDescription.trim()) {
      toast.error("Veuillez remplir le titre et la description", {
        style: { background: "#14080e", border: "1px solid #ef444433" },
      });
      return;
    }

    startTransition(async () => {
      try {
        await suggestFeature({
          title: sugTitle,
          description: sugDescription,
          category: sugCategory,
        });
        setSugTitle("");
        setSugDescription("");
        setSugCategory("CRM");
        toast.success("Suggestion envoyée ! Merci pour votre contribution.", {
          style: { background: "#14080e", border: "1px solid #7af17a33" },
        });
      } catch {
        toast.error("Erreur lors de l'envoi", {
          style: { background: "#14080e", border: "1px solid #ef444433" },
        });
      }
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roadmap"
        description="Découvrez les fonctionnalités à venir, votez pour vos priorités et suggérez des idées."
      >
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-[#7af17a]/30 text-[#7af17a] bg-[#7af17a]/10"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            {roadmapItems.filter((i) => i.status === "in_progress").length} en
            cours
          </Badge>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/80 border border-border">
          <TabsTrigger
            value="roadmap"
            className="data-[state=active]:bg-[#7af17a]/15 data-[state=active]:text-[#7af17a]"
          >
            <Map className="h-4 w-4 mr-2" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger
            value="suggestions"
            className="data-[state=active]:bg-[#7af17a]/15 data-[state=active]:text-[#7af17a]"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger
            value="releases"
            className="data-[state=active]:bg-[#7af17a]/15 data-[state=active]:text-[#7af17a]"
          >
            <Rocket className="h-4 w-4 mr-2" />
            Notes de version
          </TabsTrigger>
        </TabsList>

        {/* ── Roadmap Tab ──────────────────────────────────────────────── */}
        <TabsContent value="roadmap" className="space-y-4 mt-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {(
                [
                  { key: "all", label: "Tout" },
                  { key: "planned", label: "Planifié" },
                  { key: "in_progress", label: "En cours" },
                  { key: "done", label: "Terminé" },
                ] as const
              ).map((f) => (
                <Button
                  key={f.key}
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter(f.key)}
                  className={cn(
                    "text-xs h-7 px-3 rounded-full transition-colors",
                    statusFilter === f.key
                      ? "bg-[#7af17a]/15 text-[#7af17a] hover:bg-[#7af17a]/25"
                      : "text-muted-foreground hover:text-white hover:bg-white/5",
                  )}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSortBy(sortBy === "votes" ? "date" : "votes")}
                className="text-xs h-7 text-muted-foreground hover:text-white"
              >
                {sortBy === "votes" ? "Par votes" : "Par date"}
              </Button>
            </div>
          </div>

          {/* Column view (when "all" is selected) */}
          {statusFilter === "all" ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StatusColumn
                status="planned"
                items={grouped.planned}
                onVote={handleVote}
                voting={isPending}
              />
              <StatusColumn
                status="in_progress"
                items={grouped.in_progress}
                onVote={handleVote}
                voting={isPending}
              />
              <StatusColumn
                status="done"
                items={grouped.done}
                onVote={handleVote}
                voting={isPending}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <FeatureCard
                  key={item.id}
                  item={item}
                  showStatus
                  onVote={handleVote}
                  voting={isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Suggestions Tab ──────────────────────────────────────────── */}
        <TabsContent value="suggestions" className="space-y-6 mt-4">
          {/* Suggestion form */}
          <Card className="bg-card/60 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#7af17a]" />
                Suggérer une fonctionnalité
              </CardTitle>
              <CardDescription className="text-xs">
                Partagez vos idées pour améliorer la plateforme. Les suggestions
                les plus votées seront priorisées.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sug-title" className="text-xs">
                    Titre
                  </Label>
                  <Input
                    id="sug-title"
                    value={sugTitle}
                    onChange={(e) => setSugTitle(e.target.value)}
                    placeholder="Ex : Import depuis Pipedrive"
                    className="bg-card border-border text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sug-category" className="text-xs">
                    Catégorie
                  </Label>
                  <Select value={sugCategory} onValueChange={setSugCategory}>
                    <SelectTrigger className="bg-card border-border text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUGGESTION_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sug-description" className="text-xs">
                  Description
                </Label>
                <Textarea
                  id="sug-description"
                  value={sugDescription}
                  onChange={(e) => setSugDescription(e.target.value)}
                  placeholder="Décrivez votre idée en détail : quel problème résout-elle ? Comment devrait-elle fonctionner ?"
                  rows={3}
                  className="bg-card border-border text-sm resize-none"
                />
              </div>
              <Button
                onClick={handleSuggest}
                disabled={
                  isPending || !sugTitle.trim() || !sugDescription.trim()
                }
                className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 font-medium"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer la suggestion
              </Button>
            </CardContent>
          </Card>

          {/* Community suggestions list */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Suggestions de la communauté
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-border"
              >
                {sortedSuggestions.length}
              </Badge>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSuggestions.map((sug) => {
                const categoryColor =
                  CATEGORY_COLORS[sug.category] ||
                  "bg-gray-500/20 text-gray-400 border-gray-500/30";

                return (
                  <Card
                    key={sug.id}
                    className="bg-card/60 border-border/50 hover:shadow-md hover:border-border transition-all"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-white leading-tight">
                            {sug.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {sug.description}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(sug.id)}
                          disabled={isPending}
                          className={cn(
                            "flex flex-col items-center gap-0.5 h-auto py-1.5 px-2 shrink-0 rounded-lg transition-colors",
                            sug.votedByUser
                              ? "bg-[#7af17a]/15 text-[#7af17a] hover:bg-[#7af17a]/25"
                              : "hover:bg-white/5 text-muted-foreground hover:text-white",
                          )}
                        >
                          <ThumbsUp
                            className={cn(
                              "h-3.5 w-3.5",
                              sug.votedByUser && "fill-current",
                            )}
                          />
                          <span className="text-xs font-medium">
                            {sug.votes}
                          </span>
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            categoryColor,
                          )}
                        >
                          {sug.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          par {sug.authorName} &middot; {sug.createdAt}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ── Release Notes Tab ────────────────────────────────────────── */}
        <TabsContent value="releases" className="space-y-6 mt-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border hidden sm:block" />

            <div className="space-y-8">
              {releaseNotes.map((release, index) => (
                <div key={release.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="hidden sm:flex shrink-0 relative z-10">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center border",
                        index === 0
                          ? "bg-[#7af17a]/15 border-[#7af17a]/30 text-[#7af17a]"
                          : "bg-card border-border text-muted-foreground",
                      )}
                    >
                      <Tag className="h-4 w-4" />
                    </div>
                  </div>

                  {/* Release card */}
                  <Card className="flex-1 bg-card/60 border-border/50 hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Badge
                          className={cn(
                            "w-fit font-mono text-xs",
                            index === 0
                              ? "bg-[#7af17a]/15 text-[#7af17a] border-[#7af17a]/30"
                              : "bg-white/5 text-muted-foreground border-border",
                          )}
                          variant="outline"
                        >
                          v{release.version}
                        </Badge>
                        <CardTitle className="text-base">
                          {release.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-xs flex items-center gap-1.5 mt-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(release.date).toLocaleDateString("fr-FR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {release.changes.map((change, ci) => {
                        const changeConfig = {
                          feature: {
                            icon: Sparkles,
                            label: "Nouveau",
                            color: "text-[#7af17a]",
                            bg: "bg-[#7af17a]/10",
                          },
                          improvement: {
                            icon: Rocket,
                            label: "Amélioration",
                            color: "text-blue-400",
                            bg: "bg-blue-500/10",
                          },
                          fix: {
                            icon: CheckCircle,
                            label: "Correction",
                            color: "text-amber-400",
                            bg: "bg-amber-500/10",
                          },
                        }[change.type];

                        return (
                          <div
                            key={ci}
                            className="flex items-start gap-2.5 py-1"
                          >
                            <div
                              className={cn(
                                "shrink-0 h-5 w-5 rounded flex items-center justify-center mt-0.5",
                                changeConfig.bg,
                              )}
                            >
                              <changeConfig.icon
                                className={cn("h-3 w-3", changeConfig.color)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-white/90">
                                {change.text}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0 shrink-0 hidden sm:flex",
                                changeConfig.color,
                                "border-current/20",
                              )}
                            >
                              {changeConfig.label}
                            </Badge>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
