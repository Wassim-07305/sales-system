"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Linkedin,
  Loader2,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  Send,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  ChevronDown,
  ChevronUp,
  Users,
  Trash2,
  X,
  ArrowDownToLine,
  ArrowUpFromLine,
  Smile,
  SpellCheck,
  Briefcase,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  createFeed,
  deleteFeed,
  addProfileToFeed,
  removeProfileFromFeed,
  getFeedPosts,
  refreshFeedPosts,
  generateAiComments,
  updateAiComment,
  publishComment,
  rewriteComment,
  type LinkedInFeed,
  type FeedPost,
  type AiComment,
  type FeedProfile,
} from "@/lib/actions/linkedin-engage";

// ---------------------------------------------------------------------------
// Built-in rewrite presets
// ---------------------------------------------------------------------------
const REWRITE_PRESETS = [
  { label: "Raccourcir", icon: ArrowDownToLine, instruction: "Raccourcis ce commentaire à 1-2 lignes maximum en gardant l'essentiel." },
  { label: "Allonger", icon: ArrowUpFromLine, instruction: "Enrichis ce commentaire avec plus de détails et d'exemples. 4-5 lignes." },
  { label: "Plus formel", icon: Briefcase, instruction: "Réécris ce commentaire dans un ton plus professionnel et formel." },
  { label: "Plus naturel", icon: MessageCircle, instruction: "Réécris ce commentaire pour le rendre plus naturel et conversationnel, moins corporate." },
  { label: "Ajouter des emojis", icon: Smile, instruction: "Ajoute 1-2 emojis pertinents à ce commentaire sans changer le texte." },
  { label: "Corriger", icon: SpellCheck, instruction: "Corrige l'orthographe et la grammaire de ce commentaire sans changer le style." },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  initialFeeds: LinkedInFeed[];
  initialPosts: FeedPost[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function FeedsView({ initialFeeds, initialPosts }: Props) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(
    initialFeeds[0]?.id || null,
  );
  const [posts, setPosts] = useState(initialPosts);
  const [isPending, startTransition] = useTransition();

  // Create feed dialog
  const [showCreateFeed, setShowCreateFeed] = useState(false);
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedDesc, setNewFeedDesc] = useState("");

  // Add profile dialog
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [addProfileFeedId, setAddProfileFeedId] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [addingProfile, setAddingProfile] = useState(false);

  // Feed profiles view
  const [showFeedProfiles, setShowFeedProfiles] = useState<string | null>(null);
  const [feedProfiles, setFeedProfiles] = useState<FeedProfile[]>([]);

  // AI Comments expanded per post
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [generatingForPost, setGeneratingForPost] = useState<string | null>(null);

  // Rewrite state
  const [rewritingComment, setRewritingComment] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    text: string;
  } | null>(null);

  // Publishing state
  const [publishingComment, setPublishingComment] = useState<string | null>(null);

  // Copied state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Refreshing feed
  const [refreshingFeed, setRefreshingFeed] = useState<string | null>(null);

  const selectedFeed = feeds.find((f) => f.id === selectedFeedId);
  const filteredPosts = selectedFeedId
    ? posts.filter((p) => p.feed_id === selectedFeedId)
    : posts;

  // ------ Actions ------

  async function handleCreateFeed() {
    if (!newFeedName.trim()) return;
    startTransition(async () => {
      try {
        const feed = await createFeed(newFeedName.trim(), newFeedDesc.trim() || undefined);
        if (feed) {
          setFeeds((prev) => [{ ...feed, profiles_count: 0 }, ...prev]);
          setSelectedFeedId(feed.id);
          setShowCreateFeed(false);
          setNewFeedName("");
          setNewFeedDesc("");
          toast.success("Feed créé");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  async function handleDeleteFeed(feedId: string) {
    startTransition(async () => {
      try {
        await deleteFeed(feedId);
        setFeeds((prev) => prev.filter((f) => f.id !== feedId));
        setPosts((prev) => prev.filter((p) => p.feed_id !== feedId));
        if (selectedFeedId === feedId) {
          setSelectedFeedId(feeds.find((f) => f.id !== feedId)?.id || null);
        }
        toast.success("Feed supprimé");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur");
      }
    });
  }

  async function handleAddProfile() {
    if (!profileUrl.trim() || !addProfileFeedId) return;
    setAddingProfile(true);
    try {
      const profile = await addProfileToFeed(addProfileFeedId, profileUrl.trim());
      if (profile) {
        setFeeds((prev) =>
          prev.map((f) =>
            f.id === addProfileFeedId
              ? { ...f, profiles_count: (f.profiles_count || 0) + 1 }
              : f,
          ),
        );
        setProfileUrl("");
        setShowAddProfile(false);
        toast.success(`${profile.full_name || "Profil"} ajouté au feed`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAddingProfile(false);
    }
  }

  async function handleShowProfiles(feedId: string) {
    if (showFeedProfiles === feedId) {
      setShowFeedProfiles(null);
      return;
    }
    setShowFeedProfiles(feedId);
    try {
      const { getFeedProfiles } = await import("@/lib/actions/linkedin-engage");
      const profiles = await getFeedProfiles(feedId);
      setFeedProfiles(profiles);
    } catch {
      toast.error("Erreur lors du chargement des profils");
    }
  }

  async function handleRemoveProfile(profileId: string) {
    try {
      await removeProfileFromFeed(profileId);
      setFeedProfiles((prev) => prev.filter((p) => p.id !== profileId));
      toast.success("Profil retiré");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleRefreshFeed(feedId: string) {
    setRefreshingFeed(feedId);
    try {
      const count = await refreshFeedPosts(feedId);
      // Reload posts
      const newPosts = await getFeedPosts(feedId, 100);
      setPosts((prev) => {
        const other = prev.filter((p) => p.feed_id !== feedId);
        return [...other, ...newPosts].sort(
          (a, b) =>
            new Date(b.published_at || 0).getTime() -
            new Date(a.published_at || 0).getTime(),
        );
      });
      toast.success(`${count} nouveaux posts récupérés`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de scraping");
    } finally {
      setRefreshingFeed(null);
    }
  }

  async function handleGenerateComments(postId: string) {
    setGeneratingForPost(postId);
    setExpandedPosts((prev) => new Set(prev).add(postId));
    try {
      const comments = await generateAiComments(postId);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, ai_comments: comments } : p,
        ),
      );
      toast.success("3 commentaires générés");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur IA");
    } finally {
      setGeneratingForPost(null);
    }
  }

  async function handlePublish(
    comment: AiComment,
    post: FeedPost,
  ) {
    setPublishingComment(comment.id);
    try {
      const profileData = post.profile as FeedProfile | undefined;
      const result = await publishComment(
        comment.id,
        post.post_url || "",
        comment.comment_text,
        profileData?.full_name || "Créateur",
      );

      if (result.success) {
        // Update local state
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  ai_comments: (p.ai_comments || []).map((c) =>
                    c.id === comment.id
                      ? { ...c, status: "published" as const }
                      : c,
                  ),
                }
              : p,
          ),
        );
        toast.success(
          result.error
            ? result.error
            : "Commentaire publié sur LinkedIn",
        );
      } else {
        toast.error(result.error || "Erreur de publication");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPublishingComment(null);
    }
  }

  async function handleRewrite(commentId: string, text: string, instruction: string) {
    setRewritingComment(commentId);
    try {
      const rewritten = await rewriteComment(text, instruction);
      setPosts((prev) =>
        prev.map((p) => ({
          ...p,
          ai_comments: (p.ai_comments || []).map((c) =>
            c.id === commentId
              ? { ...c, comment_text: rewritten, status: "modified" as const }
              : c,
          ),
        })),
      );
      await updateAiComment(commentId, {
        comment_text: rewritten,
        status: "modified",
      });
      toast.success("Commentaire réécrit");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setRewritingComment(null);
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copié");
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleIgnore(commentId: string) {
    await updateAiComment(commentId, { status: "ignored" });
    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        ai_comments: (p.ai_comments || []).map((c) =>
          c.id === commentId ? { ...c, status: "ignored" as const } : c,
        ),
      })),
    );
  }

  async function handleSaveEdit(commentId: string) {
    if (!editingComment || editingComment.id !== commentId) return;
    await updateAiComment(commentId, {
      comment_text: editingComment.text,
      status: "modified",
    });
    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        ai_comments: (p.ai_comments || []).map((c) =>
          c.id === commentId
            ? { ...c, comment_text: editingComment.text, status: "modified" as const }
            : c,
        ),
      })),
    );
    setEditingComment(null);
    toast.success("Commentaire modifié");
  }

  function togglePostExpand(postId: string) {
    setExpandedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function timeAgo(date: string | null) {
    if (!date) return "";
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feeds LinkedIn"
        description="Surveillez les posts de vos cibles et commentez stratégiquement"
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT — Feed list */}
        <div className="w-full lg:w-80 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Mes feeds</h3>
            <Dialog open={showCreateFeed} onOpenChange={setShowCreateFeed}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-lg bg-brand text-brand-dark hover:bg-brand/90">
                  <Plus className="h-4 w-4 mr-1" /> Créer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un feed</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Nom du feed (ex: Prospects coaching)"
                    value={newFeedName}
                    onChange={(e) => setNewFeedName(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Input
                    placeholder="Description (optionnel)"
                    value={newFeedDesc}
                    onChange={(e) => setNewFeedDesc(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Button
                    onClick={handleCreateFeed}
                    disabled={!newFeedName.trim() || isPending}
                    className="w-full rounded-xl bg-brand text-brand-dark hover:bg-brand/90"
                  >
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Créer le feed
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* "Tous" option */}
          <Card
            className={`cursor-pointer rounded-xl transition-all ${
              !selectedFeedId
                ? "ring-2 ring-brand shadow-md"
                : "hover:shadow-sm"
            }`}
            onClick={() => setSelectedFeedId(null)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <Linkedin className="h-4 w-4 text-brand" />
              <span className="text-sm font-medium">Tous les posts</span>
              <Badge variant="outline" className="ml-auto text-xs">
                {posts.length}
              </Badge>
            </CardContent>
          </Card>

          {feeds.map((feed) => (
            <div key={feed.id} className="space-y-1">
              <Card
                className={`cursor-pointer rounded-xl transition-all ${
                  selectedFeedId === feed.id
                    ? "ring-2 ring-brand shadow-md"
                    : "hover:shadow-sm"
                }`}
                onClick={() => setSelectedFeedId(feed.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Linkedin className="h-4 w-4 text-brand shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {feed.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {feed.profiles_count || 0}
                        <Users className="h-3 w-3 ml-0.5" />
                      </Badge>
                    </div>
                  </div>
                  {feed.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {feed.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddProfileFeedId(feed.id);
                        setShowAddProfile(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Profil
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowProfiles(feed.id);
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" /> Voir
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      disabled={refreshingFeed === feed.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRefreshFeed(feed.id);
                      }}
                    >
                      <RefreshCw
                        className={`h-3 w-3 mr-1 ${refreshingFeed === feed.id ? "animate-spin" : ""}`}
                      />
                      Scraper
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFeed(feed.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Profiles drawer */}
              {showFeedProfiles === feed.id && (
                <Card className="rounded-xl">
                  <CardContent className="p-3 space-y-2">
                    {feedProfiles.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Aucun profil dans ce feed
                      </p>
                    ) : (
                      feedProfiles.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt=""
                              className="h-6 w-6 rounded-full"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {(p.full_name || "?")[0]}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">
                              {p.full_name || p.linkedin_profile_url}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleRemoveProfile(p.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ))}

          {feeds.length === 0 && (
            <Card className="rounded-xl">
              <CardContent className="p-6 text-center">
                <Linkedin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Créez votre premier feed pour commencer à surveiller des
                  profils LinkedIn
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT — Posts feed */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {selectedFeed ? selectedFeed.name : "Tous les posts"}
              <span className="text-muted-foreground font-normal ml-2">
                ({filteredPosts.length} posts)
              </span>
            </h3>
            {selectedFeedId && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg"
                disabled={refreshingFeed === selectedFeedId}
                onClick={() => handleRefreshFeed(selectedFeedId)}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${refreshingFeed === selectedFeedId ? "animate-spin" : ""}`}
                />
                Actualiser
              </Button>
            )}
          </div>

          {filteredPosts.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-12 text-center">
                <Linkedin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-1">Aucun post</h3>
                <p className="text-sm text-muted-foreground">
                  {feeds.length === 0
                    ? "Créez un feed et ajoutez des profils pour voir leurs posts"
                    : "Ajoutez des profils à ce feed puis cliquez sur \"Scraper\" pour récupérer leurs posts"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => {
                const profileData = post.profile as FeedProfile | undefined;
                const isExpanded = expandedPosts.has(post.id);
                const aiComments = post.ai_comments || [];

                return (
                  <Card key={post.id} className="rounded-2xl shadow-sm">
                    <CardContent className="p-5">
                      {/* Author header */}
                      <div className="flex items-start gap-3 mb-3">
                        {profileData?.photo_url ? (
                          <img
                            src={profileData.photo_url}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-sm font-bold text-brand">
                            {(profileData?.full_name || "?")[0]}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">
                            {profileData?.full_name || "Créateur"}
                          </p>
                          {profileData?.job_title && (
                            <p className="text-xs text-muted-foreground truncate">
                              {profileData.job_title}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {timeAgo(post.published_at)}
                          </p>
                        </div>
                        {post.post_url && (
                          <a
                            href={post.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </div>

                      {/* Post content */}
                      <div className="mb-3">
                        <p className="text-sm whitespace-pre-wrap line-clamp-4">
                          {post.content_text || "[Post sans texte]"}
                        </p>
                        {post.post_image_url && (
                          <img
                            src={post.post_image_url}
                            alt=""
                            className="mt-2 rounded-xl max-h-64 object-cover w-full"
                          />
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {post.likes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.comments_count}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          className="rounded-lg bg-brand text-brand-dark hover:bg-brand/90"
                          disabled={generatingForPost === post.id}
                          onClick={() => handleGenerateComments(post.id)}
                        >
                          {generatingForPost === post.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-1" />
                          )}
                          Générer des commentaires
                        </Button>

                        {aiComments.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg"
                            onClick={() => togglePostExpand(post.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 mr-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 mr-1" />
                            )}
                            {aiComments.length} commentaires
                          </Button>
                        )}
                      </div>

                      {/* AI Comments panel */}
                      {isExpanded && aiComments.length > 0 && (
                        <div className="mt-4 space-y-3 border-t pt-4">
                          {aiComments.map((comment) => {
                            const isEditing =
                              editingComment?.id === comment.id;

                            return (
                              <div
                                key={comment.id}
                                className={`p-3 rounded-xl border ${
                                  comment.status === "published"
                                    ? "bg-brand/5 border-brand/20"
                                    : comment.status === "ignored"
                                      ? "opacity-50"
                                      : "bg-muted/50"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {comment.comment_type === "value"
                                      ? "Valeur"
                                      : comment.comment_type === "question"
                                        ? "Question"
                                        : "Témoignage"}
                                  </Badge>
                                  {comment.status === "published" && (
                                    <Badge className="bg-brand/10 text-brand border-brand/20 text-xs">
                                      Publié
                                    </Badge>
                                  )}
                                  {comment.status === "modified" && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      Modifié
                                    </Badge>
                                  )}
                                </div>

                                {/* Comment text or editor */}
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editingComment.text}
                                      onChange={(e) =>
                                        setEditingComment({
                                          ...editingComment,
                                          text: e.target.value,
                                        })
                                      }
                                      rows={3}
                                      className="text-sm rounded-lg"
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="rounded-lg bg-brand text-brand-dark hover:bg-brand/90"
                                        onClick={() =>
                                          handleSaveEdit(comment.id)
                                        }
                                      >
                                        Sauvegarder
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="rounded-lg"
                                        onClick={() =>
                                          setEditingComment(null)
                                        }
                                      >
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm whitespace-pre-wrap mb-2">
                                    {comment.comment_text}
                                  </p>
                                )}

                                {/* Rewrite toolbar */}
                                {!isEditing &&
                                  comment.status !== "published" &&
                                  comment.status !== "ignored" && (
                                    <div className="flex items-center gap-1 flex-wrap mb-2">
                                      {REWRITE_PRESETS.map((preset) => (
                                        <Button
                                          key={preset.label}
                                          size="sm"
                                          variant="ghost"
                                          className="h-7 text-xs px-2 rounded-lg"
                                          disabled={
                                            rewritingComment === comment.id
                                          }
                                          onClick={() =>
                                            handleRewrite(
                                              comment.id,
                                              comment.comment_text,
                                              preset.instruction,
                                            )
                                          }
                                        >
                                          {rewritingComment === comment.id ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                          ) : (
                                            <preset.icon className="h-3 w-3 mr-1" />
                                          )}
                                          {preset.label}
                                        </Button>
                                      ))}
                                    </div>
                                  )}

                                {/* Action buttons */}
                                {!isEditing && comment.status !== "ignored" && (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {comment.status !== "published" && (
                                      <Button
                                        size="sm"
                                        className="rounded-lg bg-brand text-brand-dark hover:bg-brand/90 h-8"
                                        disabled={
                                          publishingComment === comment.id
                                        }
                                        onClick={() =>
                                          handlePublish(comment, post)
                                        }
                                      >
                                        {publishingComment === comment.id ? (
                                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <Send className="h-3 w-3 mr-1" />
                                        )}
                                        Publier
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="rounded-lg h-8"
                                      onClick={() =>
                                        handleCopy(
                                          comment.id,
                                          comment.comment_text,
                                        )
                                      }
                                    >
                                      {copiedId === comment.id ? (
                                        <Check className="h-3 w-3 mr-1 text-brand" />
                                      ) : (
                                        <Copy className="h-3 w-3 mr-1" />
                                      )}
                                      Copier
                                    </Button>
                                    {comment.status !== "published" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="rounded-lg h-8"
                                          onClick={() =>
                                            setEditingComment({
                                              id: comment.id,
                                              text: comment.comment_text,
                                            })
                                          }
                                        >
                                          <Edit3 className="h-3 w-3 mr-1" />
                                          Modifier
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="rounded-lg h-8 text-muted-foreground"
                                          onClick={() =>
                                            handleIgnore(comment.id)
                                          }
                                        >
                                          <ThumbsDown className="h-3 w-3 mr-1" />
                                          Ignorer
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add profile dialog */}
      <Dialog open={showAddProfile} onOpenChange={setShowAddProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un profil LinkedIn</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="https://linkedin.com/in/nom-du-profil"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              className="h-11 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Collez l&apos;URL du profil LinkedIn. Le nom et la photo seront
              récupérés automatiquement.
            </p>
            <Button
              onClick={handleAddProfile}
              disabled={!profileUrl.trim() || addingProfile}
              className="w-full rounded-xl bg-brand text-brand-dark hover:bg-brand/90"
            >
              {addingProfile && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Ajouter le profil
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
