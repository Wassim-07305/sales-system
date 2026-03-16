"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heart,
  MessageCircle,
  Trophy,
  Plus,
  Send,
  Users,
  Settings2,
  Calendar,
  ImagePlus,
  X,
  Loader2,
  HelpCircle,
  PartyPopper,
  MessagesSquare,
  ShieldCheck,
  Hash,
  Sparkles,
  Flag,
  Video,
} from "lucide-react";
import {
  createCommunityPost,
  toggleLike,
  getComments,
  addComment,
  reportPost,
  announceGroupCall,
} from "@/lib/actions/community";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ReputationBadge } from "@/components/community/reputation-badge";
import {
  LeaderboardCard,
  type LeaderboardEntry,
} from "@/components/community/leaderboard-card";

interface Post {
  id: string;
  author_id: string | null;
  type: string;
  title: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  channel: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    niche: string | null;
    role?: string;
  } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// ─── Channel definitions ───

interface ChannelDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string; // Tailwind text color
  bgColor: string; // Tailwind bg color for icon container
  borderColor: string; // Active border accent
  activeBg: string; // Active item background
  private?: boolean;
  allowedRoles?: string[];
}

const CHANNELS: ChannelDef[] = [
  {
    id: "all",
    label: "Tous les canaux",
    description: "Voir tous les posts",
    icon: <Hash className="h-4 w-4" />,
    color: "text-foreground",
    bgColor: "bg-muted",
    borderColor: "border-brand",
    activeBg: "bg-brand/8",
  },
  {
    id: "questions",
    label: "Questions globales",
    description: "Posez vos questions \u00e0 la communaut\u00e9",
    icon: <HelpCircle className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
    activeBg: "bg-blue-500/8",
  },
  {
    id: "wins",
    label: "Wins & Victoires",
    description: "Partagez vos succ\u00e8s et c\u00e9l\u00e9brez",
    icon: <PartyPopper className="h-4 w-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500",
    activeBg: "bg-emerald-500/8",
  },
  {
    id: "general",
    label: "Chat g\u00e9n\u00e9ral",
    description: "Discussion libre entre membres",
    icon: <MessagesSquare className="h-4 w-4" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500",
    activeBg: "bg-amber-500/8",
  },
  {
    id: "team_interne",
    label: "Team interne",
    description: "Canal priv\u00e9 admin / manager / setter",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    activeBg: "bg-purple-500/8",
    private: true,
    allowedRoles: ["admin", "manager", "setter"],
  },
];

const typeColors: Record<string, string> = {
  win: "bg-brand/10 text-brand-dark border-brand/30",
  question: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  discussion: "bg-muted/50 text-muted-foreground border-border",
};

const typeLabels: Record<string, string> = {
  win: "Win",
  question: "Question",
  discussion: "Discussion",
};

export function CommunityView({
  posts,
  userId,
  isAdmin,
  leaderboard = [],
  reputations = {},
  userRole = "client_b2c",
  channelCounts = {},
  pendingReportsCount = 0,
}: {
  posts: Post[];
  userId: string;
  isAdmin: boolean;
  leaderboard?: LeaderboardEntry[];
  reputations?: Record<string, number>;
  userRole?: string;
  channelCounts?: Record<string, number>;
  pendingReportsCount?: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [newChannel, setNewChannel] = useState("general");
  const [newType, setNewType] = useState("discussion");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImagePreview, setNewImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [reportDialog, setReportDialog] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportCategory, setReportCategory] = useState("autre");
  const [isReporting, setIsReporting] = useState(false);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callTitle, setCallTitle] = useState("");
  const [callDesc, setCallDesc] = useState("");
  const [callPosting, setCallPosting] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Filter channels by role
  const visibleChannels = CHANNELS.filter((ch) => {
    if (!ch.allowedRoles) return true;
    return ch.allowedRoles.includes(userRole);
  });

  // Filter posts: by channel, then by type tab
  const channelFiltered =
    activeChannel === "all"
      ? posts.filter((p) => {
          // Hide team_interne posts from users who don't have access
          if (p.channel === "team_interne") {
            const teamChannel = CHANNELS.find((c) => c.id === "team_interne");
            if (
              teamChannel?.allowedRoles &&
              !teamChannel.allowedRoles.includes(userRole)
            )
              return false;
          }
          return true;
        })
      : posts.filter((p) => (p.channel || "general") === activeChannel);

  const filtered =
    activeTab === "all"
      ? channelFiltered
      : channelFiltered.filter((p) => p.type === activeTab);

  const activeChannelDef =
    CHANNELS.find((ch) => ch.id === activeChannel) || CHANNELS[0];

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 10 Mo");
      return;
    }
    setUploadingImage(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `posts/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("community")
        .upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("community").getPublicUrl(path);
      setNewImageUrl(data.publicUrl);
      setNewImagePreview(data.publicUrl);
      toast.success("Image ajout\u00e9e !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleCreate() {
    if (!newContent.trim()) return;
    setIsPosting(true);
    try {
      await createCommunityPost({
        type: newType,
        title: newTitle || undefined,
        content: newContent,
        image_url: newImageUrl || undefined,
        channel: newChannel,
      });
      toast.success("Post publi\u00e9 !");
      setDialogOpen(false);
      setNewContent("");
      setNewTitle("");
      setNewType("discussion");
      setNewChannel("general");
      setNewImageUrl("");
      setNewImagePreview("");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la publication",
      );
    } finally {
      setIsPosting(false);
    }
  }

  async function handleLike(postId: string) {
    const liked = likedPosts.has(postId);
    const newSet = new Set(likedPosts);
    if (liked) newSet.delete(postId);
    else newSet.add(postId);
    setLikedPosts(newSet);
    await toggleLike(postId, !liked);
    router.refresh();
  }

  async function handleExpandComments(postId: string) {
    if (expandedComments === postId) {
      setExpandedComments(null);
      return;
    }
    const data = await getComments(postId);
    setComments(data as Comment[]);
    setExpandedComments(postId);
  }

  async function handleAddComment(postId: string) {
    if (!commentText.trim()) return;
    await addComment(postId, commentText);
    setCommentText("");
    const data = await getComments(postId);
    setComments(data as Comment[]);
    router.refresh();
  }

  async function handleReport() {
    if (!reportDialog || !reportReason.trim()) {
      toast.error("Veuillez saisir une raison");
      return;
    }
    setIsReporting(true);
    try {
      const result = await reportPost(
        reportDialog,
        reportReason,
        reportCategory,
      );
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Signalement envoyé. Les modérateurs vont l'examiner.");
      }
      setReportDialog(null);
      setReportReason("");
      setReportCategory("autre");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors du signalement",
      );
    } finally {
      setIsReporting(false);
    }
  }

  function PostCard({ post, isWinGrid }: { post: Post; isWinGrid?: boolean }) {
    const postChannel = CHANNELS.find(
      (c) => c.id === (post.channel || "general"),
    );
    return (
      <Card
        className={`rounded-2xl border-border/40 transition-all duration-300 hover:shadow-lg hover:shadow-brand/5 ${post.type === "win" && isWinGrid ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent" : ""}`}
      >
        <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
          {/* Author row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand font-semibold text-sm ring-1 ring-brand/20 shrink-0">
              {post.author?.full_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold truncate">
                  {post.author?.full_name || "Anonyme"}
                </p>
                {post.author?.id &&
                  reputations[post.author.id] !== undefined && (
                    <ReputationBadge score={reputations[post.author.id]} />
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeChannel === "all" &&
                postChannel &&
                postChannel.id !== "all" && (
                  <Badge
                    variant="outline"
                    className={`text-[11px] ${postChannel.color} ${postChannel.bgColor} border-current/15`}
                  >
                    {postChannel.private && (
                      <ShieldCheck className="h-3 w-3 mr-0.5" />
                    )}
                    {postChannel.label}
                  </Badge>
                )}
              <Badge
                variant="outline"
                className={`text-[11px] ${typeColors[post.type]}`}
              >
                {post.type === "win" && <Trophy className="h-3 w-3 mr-0.5" />}
                {typeLabels[post.type]}
              </Badge>
            </div>
          </div>

          {/* Post body */}
          {post.title && (
            <h3 className="font-semibold text-[15px] mb-2 leading-snug">
              {post.title}
            </h3>
          )}
          <p className="text-sm text-foreground/80 leading-relaxed mb-5 whitespace-pre-wrap">
            {post.content}
          </p>
          {post.image_url && (
            <Image
              src={post.image_url}
              alt=""
              width={800}
              height={400}
              className="rounded-xl mb-5 max-h-72 object-cover w-full"
              loading="lazy"
            />
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 border-t pt-4">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-all ${
                likedPosts.has(post.id)
                  ? "text-red-500 bg-red-500/10"
                  : "text-muted-foreground hover:text-red-500 hover:bg-red-500/5"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${likedPosts.has(post.id) ? "fill-red-500" : ""}`}
              />
              <span className="font-medium">
                {post.likes_count + (likedPosts.has(post.id) ? 1 : 0)}
              </span>
            </button>
            <button
              onClick={() => handleExpandComments(post.id)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-brand hover:bg-brand/5 transition-all"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">Commenter</span>
            </button>
            {post.author_id !== userId && (
              <button
                onClick={() => setReportDialog(post.id)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-amber-500 hover:bg-amber-500/5 transition-all ml-auto"
              >
                <Flag className="h-4 w-4" />
                <span className="font-medium">Signaler</span>
              </button>
            )}
          </div>

          {/* Comments section */}
          {expandedComments === post.id && (
            <div className="mt-4 pt-4 border-t space-y-3">
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Aucun commentaire pour le moment
                </p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3 group">
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold shrink-0">
                    {c.author?.full_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xs font-semibold">
                        {c.author?.full_name || "Anonyme"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/80 mt-0.5">
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleAddComment(post.id)
                  }
                  className="flex-1 h-9 text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 hover:bg-brand/10 hover:text-brand hover:border-brand/30"
                  onClick={() => handleAddComment(post.id)}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Communaut\u00e9"
        description="\u00c9changez avec les autres membres"
      >
        <div className="flex gap-2">
          <Link href="/community/events">
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              \u00c9v\u00e9nements
            </Button>
          </Link>
          <Link href="/community/members">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Membres
            </Button>
          </Link>
          {isAdmin && (
            <Link href="/community/manage">
              <Button variant="outline" size="sm" className="relative">
                <Settings2 className="h-4 w-4 mr-2" />
                Modération
                {pendingReportsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {pendingReportsCount}
                  </span>
                )}
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCallDialogOpen(true)}
            >
              <Video className="h-4 w-4 mr-2" />
              Appel de groupe
            </Button>
          )}
          <Button
            onClick={() => {
              setNewChannel(
                activeChannel === "all" ? "general" : activeChannel,
              );
              setDialogOpen(true);
            }}
            className="bg-brand text-brand-dark hover:bg-brand/90 font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau post
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Channel sidebar ─── */}
        <div className="lg:w-64 shrink-0">
          {/* Mobile: horizontal scroll */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
              {visibleChannels.map((ch) => {
                const isActive = activeChannel === ch.id;
                const count =
                  ch.id === "all"
                    ? channelCounts.all || 0
                    : channelCounts[ch.id] || 0;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all shrink-0 ${
                      isActive
                        ? `${ch.activeBg} ${ch.color} ring-1 ring-current/20`
                        : "bg-card text-muted-foreground hover:bg-accent/30 border border-border"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center ${ch.color}`}
                    >
                      {ch.icon}
                    </span>
                    {ch.label}
                    {count > 0 && (
                      <span className="text-[11px] bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: vertical sidebar */}
          <div className="hidden lg:block sticky top-20">
            <div className="rounded-2xl border border-border/40 bg-card p-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-2">
                Canaux
              </h3>
              <nav className="space-y-1">
                {visibleChannels.map((ch) => {
                  const isActive = activeChannel === ch.id;
                  const count =
                    ch.id === "all"
                      ? channelCounts.all || 0
                      : channelCounts[ch.id] || 0;

                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannel(ch.id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all group ${
                        isActive
                          ? `${ch.activeBg} font-semibold ${ch.color}`
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          isActive
                            ? `${ch.bgColor} ${ch.color}`
                            : `bg-muted/80 ${ch.color} group-hover:${ch.bgColor}`
                        }`}
                      >
                        {ch.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block leading-tight truncate">
                          {ch.label}
                        </span>
                        {ch.private && (
                          <span className="flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="h-2.5 w-2.5 text-purple-400" />
                            <span className="text-[10px] text-purple-400 font-medium">
                              Priv\u00e9
                            </span>
                          </span>
                        )}
                      </span>
                      {count > 0 && (
                        <span
                          className={`text-[11px] font-semibold rounded-full px-2 py-0.5 min-w-[24px] text-center ${
                            isActive
                              ? `${ch.bgColor} ${ch.color}`
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* ─── Main content ─── */}
        <div className="flex-1 min-w-0">
          {/* Active channel header banner */}
          {activeChannel !== "all" && (
            <div
              className={`relative flex items-center gap-4 mb-6 p-5 rounded-xl border overflow-hidden ${activeChannelDef.bgColor}`}
            >
              {/* Subtle gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background/40 pointer-events-none" />
              <span
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border/50 ${activeChannelDef.color}`}
              >
                {activeChannelDef.icon}
              </span>
              <div className="relative flex-1">
                <h2 className="font-semibold text-base flex items-center gap-2">
                  {activeChannelDef.label}
                  {activeChannelDef.private && (
                    <Badge
                      variant="outline"
                      className="text-[10px] border-purple-500/30 text-purple-500 bg-purple-500/5"
                    >
                      <ShieldCheck className="h-3 w-3 mr-0.5" /> Priv\u00e9
                    </Badge>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeChannelDef.description}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setNewChannel(activeChannel);
                  setDialogOpen(true);
                }}
                className="relative bg-brand text-brand-dark hover:bg-brand/90 font-semibold hidden sm:flex"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Publier
              </Button>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="win">
                <Trophy className="h-4 w-4 mr-1" />
                Wins
              </TabsTrigger>
              <TabsTrigger value="question">Questions</TabsTrigger>
              <TabsTrigger value="discussion">Discussions</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4">
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="win">
              <div className="grid md:grid-cols-2 gap-4">
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} isWinGrid />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="question">
              <div className="space-y-4">
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="discussion">
              <div className="space-y-4">
                {filtered.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Empty state */}
          {filtered.length === 0 && (
            <Card className="mt-4">
              <CardContent className="px-6 py-16 text-center">
                <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-brand" />
                </div>
                <p className="font-semibold text-base mb-1">
                  Aucun post dans ce canal
                </p>
                <p className="text-sm text-muted-foreground mb-5">
                  Soyez le premier \u00e0 lancer la discussion !
                </p>
                <Button
                  onClick={() => {
                    setNewChannel(
                      activeChannel === "all" ? "general" : activeChannel,
                    );
                    setDialogOpen(true);
                  }}
                  className="bg-brand text-brand-dark hover:bg-brand/90 font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Cr\u00e9er un post
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Leaderboard sidebar ─── */}
        {leaderboard.length > 0 && (
          <div className="lg:w-72 shrink-0">
            <div className="sticky top-20">
              <LeaderboardCard entries={leaderboard} />
            </div>
          </div>
        )}
      </div>

      {/* ─── New post dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Nouveau post</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Partagez avec la communaut\u00e9
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Channel & Type row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Canal
                </Label>
                <Select
                  value={newChannel}
                  onValueChange={(v) => setNewChannel(v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {visibleChannels
                      .filter((ch) => ch.id !== "all")
                      .map((ch) => (
                        <SelectItem key={ch.id} value={ch.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded ${ch.bgColor} ${ch.color}`}
                            >
                              {ch.icon}
                            </span>
                            {ch.label}
                            {ch.private && (
                              <ShieldCheck className="h-3 w-3 text-purple-500" />
                            )}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Type
                </Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="discussion">Discussion</SelectItem>
                    <SelectItem value="win">Win</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Titre{" "}
                <span className="normal-case font-normal">(optionnel)</span>
              </Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Donnez un titre \u00e0 votre post..."
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contenu
              </Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
                placeholder="Que souhaitez-vous partager ?"
                className="resize-none"
              />
            </div>

            {/* Image upload */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Image{" "}
                <span className="normal-case font-normal">(optionnel)</span>
              </Label>
              {newImagePreview ? (
                <div className="relative mt-1">
                  <img
                    src={newImagePreview}
                    alt="Aper\u00e7u"
                    className="w-full rounded-xl max-h-48 object-cover ring-1 ring-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewImageUrl("");
                      setNewImagePreview("");
                    }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-6 text-sm text-muted-foreground hover:border-brand/50 hover:text-brand hover:bg-brand/5 transition-all"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  {uploadingImage ? "Upload en cours..." : "Ajouter une image"}
                </button>
              )}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={isPosting || !newContent.trim()}
              className="w-full h-11 bg-brand text-brand-dark hover:bg-brand/90 font-semibold text-sm"
            >
              {isPosting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Publier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Report dialog ─── */}
      <Dialog
        open={!!reportDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReportDialog(null);
            setReportReason("");
            setReportCategory("autre");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-amber-500" />
              Signaler ce post
            </DialogTitle>
            <DialogDescription>
              Ce signalement sera examiné par les modérateurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catégorie
              </Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="contenu_inapproprie">
                    Contenu inapproprié
                  </SelectItem>
                  <SelectItem value="hors_sujet">Hors sujet</SelectItem>
                  <SelectItem value="harcelement">Harcèlement</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Raison
              </Label>
              <Textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Décrivez pourquoi vous signalez ce post..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setReportDialog(null);
                setReportReason("");
                setReportCategory("autre");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleReport}
              disabled={isReporting || !reportReason.trim()}
              className="bg-amber-500 text-white hover:bg-amber-600"
            >
              {isReporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Flag className="h-4 w-4 mr-2" />
              )}
              Envoyer le signalement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Group call dialog ─── */}
      <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5" />
              Annoncer un appel de groupe
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Un post sera publie et tous les membres seront notifies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={callTitle}
                onChange={(e) => setCallTitle(e.target.value)}
                placeholder="Ex : Appel de groupe — Lundi 18h"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={callDesc}
                onChange={(e) => setCallDesc(e.target.value)}
                placeholder="Details de l'appel, lien de la reunion..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCallDialogOpen(false)}
                disabled={callPosting}
              >
                Annuler
              </Button>
              <Button
                disabled={callPosting || !callTitle.trim() || !callDesc.trim()}
                className="bg-brand text-brand-dark hover:bg-brand/90"
                onClick={async () => {
                  setCallPosting(true);
                  try {
                    await announceGroupCall({
                      channel:
                        activeChannel === "all" ? "general" : activeChannel,
                      title: callTitle.trim(),
                      description: callDesc.trim(),
                    });
                    toast.success("Appel de groupe annonce !");
                    setCallDialogOpen(false);
                    setCallTitle("");
                    setCallDesc("");
                    router.refresh();
                  } catch {
                    toast.error("Erreur lors de l'annonce");
                  } finally {
                    setCallPosting(false);
                  }
                }}
              >
                {callPosting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Annoncer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
