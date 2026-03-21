"use client";

import { useState, useTransition } from "react";
import {
  Linkedin,
  Instagram,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Heart,
  Share2,
  SkipForward,
  Filter,
  Search,
  Plus,
  Loader2,
  Zap,
  Clock,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { ProspectPost, LinkHubStats } from "@/lib/actions/linkhub";
import {
  getProspectPostsFeed,
  scrapeLinkedInPosts,
  scrapeInstagramPosts,
  scrapeAllProspectPosts,
  generateCommentSuggestions,
  markPostEngaged,
  deleteProspectPost,
} from "@/lib/actions/linkhub";

// ─── Props ──────────────────────────────────────────────────────────────────

interface LinkHubViewProps {
  initialPosts: ProspectPost[];
  initialStats: LinkHubStats | null;
  prospects: Array<{
    id: string;
    full_name: string | null;
    profile_url: string | null;
    platform: string | null;
    status: string | null;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const COMMENT_TYPE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  value: { label: "Valeur", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: "💡" },
  question: { label: "Question", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: "❓" },
  story: { label: "Story", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: "📖" },
};

const ENGAGEMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "bg-muted text-muted-foreground" },
  commented: { label: "Commenté", color: "bg-brand/10 text-brand border-brand/20" },
  liked: { label: "Liké", color: "bg-pink-500/10 text-pink-500 border-pink-500/20" },
  shared: { label: "Partagé", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  skipped: { label: "Passé", color: "bg-muted/60 text-muted-foreground/60" },
};

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}j`;
  return `${Math.floor(days / 30)}mois`;
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trim() + "…";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function LinkHubView({ initialPosts, initialStats, prospects }: LinkHubViewProps) {
  const [posts, setPosts] = useState<ProspectPost[]>(initialPosts);
  const [stats, setStats] = useState<LinkHubStats | null>(initialStats);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState<string | null>(null);
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapePlatform, setScrapePlatform] = useState<"linkedin" | "instagram">("linkedin");
  const [isPending, startTransition] = useTransition();

  // ─── Refresh feed ───────────────────────────────────────────────────────

  async function refreshFeed() {
    startTransition(async () => {
      const filters: { platform?: "linkedin" | "instagram"; status?: string; search?: string } = {};
      if (platformFilter !== "all") filters.platform = platformFilter as "linkedin" | "instagram";
      if (statusFilter !== "all") filters.status = statusFilter;
      if (search) filters.search = search;

      const { posts: newPosts, stats: newStats } = await getProspectPostsFeed(filters);
      setPosts(newPosts);
      setStats(newStats);
    });
  }

  // ─── Scrape posts ──────────────────────────────────────────────────────

  async function handleScrape() {
    if (!scrapeUrl.trim()) {
      toast.error("Veuillez entrer une URL ou un nom d'utilisateur.");
      return;
    }

    startTransition(async () => {
      try {
        let result;
        if (scrapePlatform === "linkedin") {
          result = await scrapeLinkedInPosts(scrapeUrl.trim());
        } else {
          // Extraire le username de l'URL si nécessaire
          const username = scrapeUrl.includes("instagram.com")
            ? scrapeUrl.replace(/\/$/, "").split("/").pop() || scrapeUrl
            : scrapeUrl.trim().replace("@", "");
          result = await scrapeInstagramPosts(username);
        }
        toast.success(result.message);
        setScrapeDialogOpen(false);
        setScrapeUrl("");
        await refreshFeed();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du scraping.");
      }
    });
  }

  async function handleScrapeAll() {
    startTransition(async () => {
      try {
        const result = await scrapeAllProspectPosts();
        toast.success(result.message);
        await refreshFeed();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur lors du scraping.");
      }
    });
  }

  // ─── Generate AI suggestions ───────────────────────────────────────────

  async function handleGenerateSuggestions(postId: string) {
    setLoadingSuggestions(postId);
    try {
      const suggestions = await generateCommentSuggestions(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, ai_suggestions: suggestions } : p,
        ),
      );
      setExpandedPost(postId);
      toast.success("Suggestions générées !");
    } catch {
      toast.error("Erreur lors de la génération des suggestions.");
    } finally {
      setLoadingSuggestions(null);
    }
  }

  // ─── Copy comment ─────────────────────────────────────────────────────

  async function handleCopyComment(postId: string, comment: string) {
    await navigator.clipboard.writeText(comment);
    setCopiedId(`${postId}-${comment.slice(0, 20)}`);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Commentaire copié !");
  }

  // ─── Mark engagement ──────────────────────────────────────────────────

  async function handleMarkEngaged(
    postId: string,
    status: "commented" | "liked" | "shared" | "skipped",
    selectedComment?: string,
  ) {
    startTransition(async () => {
      try {
        await markPostEngaged(postId, status, selectedComment);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, engagement_status: status, selected_comment: selectedComment || p.selected_comment }
              : p,
          ),
        );
        const label = ENGAGEMENT_STATUS_LABELS[status]?.label || status;
        toast.success(`Post marqué comme « ${label} »`);
      } catch {
        toast.error("Erreur lors de la mise à jour.");
      }
    });
  }

  // ─── Delete post ──────────────────────────────────────────────────────

  async function handleDelete(postId: string) {
    startTransition(async () => {
      try {
        await deleteProspectPost(postId);
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        toast.success("Post supprimé.");
      } catch {
        toast.error("Erreur lors de la suppression.");
      }
    });
  }

  // ─── Filtered posts ──────────────────────────────────────────────────

  const filteredPosts = posts.filter((p) => {
    if (platformFilter !== "all" && p.platform !== platformFilter) return false;
    if (statusFilter !== "all" && p.engagement_status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.author_name.toLowerCase().includes(s) && !(p.post_text || "").toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="LinkHub"
        description="Feed d'engagement — Commentez les posts de vos prospects pour vous faire remarquer avant de les contacter en DM."
      >
        <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-4 mr-1.5" />
              Importer des posts
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importer des posts</DialogTitle>
              <DialogDescription>
                Entrez l&apos;URL d&apos;un profil LinkedIn ou le nom d&apos;utilisateur Instagram pour importer les derniers posts.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <Button
                  variant={scrapePlatform === "linkedin" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScrapePlatform("linkedin")}
                >
                  <Linkedin className="size-4 mr-1.5" />
                  LinkedIn
                </Button>
                <Button
                  variant={scrapePlatform === "instagram" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setScrapePlatform("instagram")}
                >
                  <Instagram className="size-4 mr-1.5" />
                  Instagram
                </Button>
              </div>
              <Input
                placeholder={
                  scrapePlatform === "linkedin"
                    ? "https://linkedin.com/in/nom-du-prospect"
                    : "nom_utilisateur ou URL Instagram"
                }
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setScrapeDialogOpen(false)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleScrape} disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <RefreshCw className="size-4 mr-1.5" />}
                  Importer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={handleScrapeAll} disabled={isPending}>
                {isPending ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Zap className="size-4 mr-1.5" />}
                Tout scraper
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Scraper les posts des 20 premiers prospects actifs</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PageHeader>

      {/* ─── Stats ─────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="text-xs text-muted-foreground">Total posts</div>
            <div className="text-xl font-bold">{stats.totalPosts}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" /> En attente
            </div>
            <div className="text-xl font-bold">{stats.pendingPosts}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Commentés
            </div>
            <div className="text-xl font-bold text-brand">{stats.commentedPosts}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Linkedin className="size-3" /> LinkedIn
            </div>
            <div className="text-xl font-bold">{stats.linkedinPosts}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Instagram className="size-3" /> Instagram
            </div>
            <div className="text-xl font-bold">{stats.instagramPosts}</div>
          </Card>
        </div>
      )}

      {/* ─── Filtres ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou contenu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="size-4 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Plateforme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="commented">Commenté</SelectItem>
            <SelectItem value="liked">Liké</SelectItem>
            <SelectItem value="shared">Partagé</SelectItem>
            <SelectItem value="skipped">Passé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Feed ──────────────────────────────────────────────────────── */}
      {filteredPosts.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <MessageCircle className="size-10 opacity-30" />
            <p className="text-sm">
              {posts.length === 0
                ? "Aucun post importé. Cliquez sur « Importer des posts » ou « Tout scraper » pour commencer."
                : "Aucun post ne correspond aux filtres."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isExpanded={expandedPost === post.id}
              onToggleExpand={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              onGenerateSuggestions={() => handleGenerateSuggestions(post.id)}
              isLoadingSuggestions={loadingSuggestions === post.id}
              onCopyComment={(comment) => handleCopyComment(post.id, comment)}
              copiedId={copiedId}
              onMarkEngaged={(status, comment) => handleMarkEngaged(post.id, status, comment)}
              onDelete={() => handleDelete(post.id)}
              isPending={isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Post Card Component ────────────────────────────────────────────────────

interface PostCardProps {
  post: ProspectPost;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onGenerateSuggestions: () => void;
  isLoadingSuggestions: boolean;
  onCopyComment: (comment: string) => void;
  copiedId: string | null;
  onMarkEngaged: (status: "commented" | "liked" | "shared" | "skipped", comment?: string) => void;
  onDelete: () => void;
  isPending: boolean;
}

function PostCard({
  post,
  isExpanded,
  onToggleExpand,
  onGenerateSuggestions,
  isLoadingSuggestions,
  onCopyComment,
  copiedId,
  onMarkEngaged,
  onDelete,
  isPending,
}: PostCardProps) {
  const hasSuggestions = post.ai_suggestions && post.ai_suggestions.length > 0;
  const statusInfo = ENGAGEMENT_STATUS_LABELS[post.engagement_status];

  return (
    <Card className="overflow-hidden">
      {/* ─── Post Header ──────────────────────────────────────────────── */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar / Platform icon */}
            <div className="relative shrink-0">
              {post.author_avatar_url ? (
                <img
                  src={post.author_avatar_url}
                  alt={post.author_name}
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                  {post.platform === "linkedin" ? (
                    <Linkedin className="size-5 text-[#0A66C2]" />
                  ) : (
                    <Instagram className="size-5 text-[#E4405F]" />
                  )}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-background flex items-center justify-center">
                {post.platform === "linkedin" ? (
                  <Linkedin className="size-3 text-[#0A66C2]" />
                ) : (
                  <Instagram className="size-3 text-[#E4405F]" />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm truncate">{post.author_name}</span>
                {post.published_at && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {timeAgo(post.published_at)}
                  </span>
                )}
              </div>
              {post.author_headline && (
                <p className="text-xs text-muted-foreground truncate">{post.author_headline}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={statusInfo?.color}>
              {statusInfo?.label}
            </Badge>
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>
      </CardHeader>

      {/* ─── Post Content ─────────────────────────────────────────────── */}
      <CardContent className="pt-0 space-y-3">
        {post.post_text && (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {isExpanded ? post.post_text : truncateText(post.post_text, 280)}
          </p>
        )}

        {post.post_image_url && (
          <div className="rounded-lg overflow-hidden bg-muted max-h-64">
            <img
              src={post.post_image_url}
              alt="Post"
              className="w-full h-full object-cover max-h-64"
            />
          </div>
        )}

        {!post.post_text && !post.post_image_url && (
          <p className="text-sm text-muted-foreground italic flex items-center gap-1.5">
            <ImageIcon className="size-4" />
            Contenu du post non disponible — ouvrir le lien pour voir le post original.
          </p>
        )}

        <Separator />

        {/* ─── Actions Bar ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateSuggestions}
            disabled={isLoadingSuggestions}
            className="text-xs"
          >
            {isLoadingSuggestions ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5 mr-1.5" />
            )}
            {hasSuggestions ? "Regénérer" : "Suggestions IA"}
          </Button>

          {hasSuggestions && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="text-xs"
            >
              <MessageCircle className="size-3.5 mr-1.5" />
              {isExpanded ? "Masquer" : `Voir ${post.ai_suggestions.length} commentaires`}
            </Button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onMarkEngaged("liked")}
                    disabled={isPending || post.engagement_status === "liked"}
                  >
                    <Heart className={`size-4 ${post.engagement_status === "liked" ? "fill-pink-500 text-pink-500" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marquer comme liké</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onMarkEngaged("shared")}
                    disabled={isPending || post.engagement_status === "shared"}
                  >
                    <Share2 className={`size-4 ${post.engagement_status === "shared" ? "text-blue-500" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marquer comme partagé</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => onMarkEngaged("skipped")}
                    disabled={isPending || post.engagement_status === "skipped"}
                  >
                    <SkipForward className={`size-4 ${post.engagement_status === "skipped" ? "text-muted-foreground" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Passer ce post</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* ─── AI Comment Suggestions List ────────────────────────────── */}
        {isExpanded && hasSuggestions && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Suggestions de commentaires
            </p>
            {post.ai_suggestions.map((suggestion, idx) => {
              const typeInfo = COMMENT_TYPE_LABELS[suggestion.type] || {
                label: suggestion.type,
                color: "bg-muted text-muted-foreground",
                icon: "💬",
              };
              const isCopied = copiedId === `${post.id}-${suggestion.comment.slice(0, 20)}`;

              return (
                <div
                  key={idx}
                  className="group relative rounded-lg border bg-card p-3 hover:border-foreground/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">{typeInfo.icon}</span>
                        <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>
                          {typeInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{suggestion.comment}</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => onCopyComment(suggestion.comment)}
                            >
                              {isCopied ? (
                                <Check className="size-4 text-brand" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copier le commentaire</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              onClick={() => {
                                onCopyComment(suggestion.comment);
                                onMarkEngaged("commented", suggestion.comment);
                              }}
                              disabled={isPending}
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copier + marquer comme commenté</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Already commented indicator ────────────────────────────── */}
        {post.engagement_status === "commented" && post.selected_comment && !isExpanded && (
          <div className="text-xs text-muted-foreground bg-brand/5 rounded-md p-2 border border-brand/10">
            <span className="font-medium text-brand">Commentaire utilisé :</span>{" "}
            {truncateText(post.selected_comment, 120)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
