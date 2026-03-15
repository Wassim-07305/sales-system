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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Heart, MessageCircle, Trophy, Plus, Send, Users, Settings2, Calendar, ImagePlus, X, Loader2,
  HelpCircle, PartyPopper, MessagesSquare, ShieldCheck, Hash,
} from "lucide-react";
import { createCommunityPost, toggleLike, getComments, addComment } from "@/lib/actions/community";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ReputationBadge } from "@/components/community/reputation-badge";
import { LeaderboardCard, type LeaderboardEntry } from "@/components/community/leaderboard-card";

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
  author: { id: string; full_name: string | null; avatar_url: string | null; niche: string | null; role?: string } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

// ─── Channel definitions ───

interface ChannelDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;          // Tailwind text color
  bgColor: string;        // Tailwind bg color for icon container
  borderColor: string;    // Active border accent
  private?: boolean;
  allowedRoles?: string[];
}

const CHANNELS: ChannelDef[] = [
  {
    id: "all",
    label: "Tous les canaux",
    description: "Voir tous les posts",
    icon: <Hash className="h-4 w-4" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-brand",
  },
  {
    id: "questions",
    label: "Questions globales",
    description: "Posez vos questions \u00e0 la communaut\u00e9",
    icon: <HelpCircle className="h-4 w-4" />,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500",
  },
  {
    id: "wins",
    label: "Wins & Victoires",
    description: "Partagez vos succ\u00e8s et c\u00e9l\u00e9brez",
    icon: <PartyPopper className="h-4 w-4" />,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500",
  },
  {
    id: "general",
    label: "Chat g\u00e9n\u00e9ral",
    description: "Discussion libre entre membres",
    icon: <MessagesSquare className="h-4 w-4" />,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500",
  },
  {
    id: "team_interne",
    label: "Team interne",
    description: "Canal priv\u00e9 admin / manager / setter",
    icon: <ShieldCheck className="h-4 w-4" />,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500",
    private: true,
    allowedRoles: ["admin", "manager", "setter"],
  },
];

const typeColors: Record<string, string> = {
  win: "bg-brand/10 text-brand-dark border-brand/30",
  question: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  discussion: "bg-muted/50 text-muted-foreground border-border",
};

const typeLabels: Record<string, string> = { win: "Win", question: "Question", discussion: "Discussion" };

export function CommunityView({
  posts,
  userId,
  isAdmin,
  leaderboard = [],
  reputations = {},
  userRole = "client_b2c",
  channelCounts = {},
}: {
  posts: Post[];
  userId: string;
  isAdmin: boolean;
  leaderboard?: LeaderboardEntry[];
  reputations?: Record<string, number>;
  userRole?: string;
  channelCounts?: Record<string, number>;
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
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Filter channels by role
  const visibleChannels = CHANNELS.filter((ch) => {
    if (!ch.allowedRoles) return true;
    return ch.allowedRoles.includes(userRole);
  });

  // Filter posts: by channel, then by type tab
  const channelFiltered = activeChannel === "all"
    ? posts.filter((p) => {
        // Hide team_interne posts from users who don't have access
        if (p.channel === "team_interne") {
          const teamChannel = CHANNELS.find((c) => c.id === "team_interne");
          if (teamChannel?.allowedRoles && !teamChannel.allowedRoles.includes(userRole)) return false;
        }
        return true;
      })
    : posts.filter((p) => (p.channel || "general") === activeChannel);

  const filtered = activeTab === "all" ? channelFiltered : channelFiltered.filter((p) => p.type === activeTab);

  const activeChannelDef = CHANNELS.find((ch) => ch.id === activeChannel) || CHANNELS[0];

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
      const { error } = await supabase.storage.from("community").upload(path, file, { upsert: true });
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
      toast.error(err instanceof Error ? err.message : "Erreur lors de la publication");
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

  function PostCard({ post, isWinGrid }: { post: Post; isWinGrid?: boolean }) {
    const postChannel = CHANNELS.find((c) => c.id === (post.channel || "general"));
    return (
      <Card className={`${post.type === "win" && isWinGrid ? "border-emerald-500/20 bg-emerald-500/5" : ""}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand text-xs font-bold ring-1 ring-brand/20">
              {post.author?.full_name?.charAt(0) || "?"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium">{post.author?.full_name || "Anonyme"}</p>
                {post.author?.id && reputations[post.author.id] !== undefined && (
                  <ReputationBadge score={reputations[post.author.id]} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {activeChannel === "all" && postChannel && postChannel.id !== "all" && (
                <Badge variant="outline" className={`text-xs ${postChannel.color} ${postChannel.bgColor} border-transparent`}>
                  {postChannel.private && <ShieldCheck className="h-3 w-3 mr-1" />}
                  {postChannel.label}
                </Badge>
              )}
              <Badge variant="outline" className={`${typeColors[post.type]}`}>
                {post.type === "win" && <Trophy className="h-3 w-3 mr-1" />}
                {typeLabels[post.type]}
              </Badge>
            </div>
          </div>
          {post.title && <h3 className="font-semibold mb-2">{post.title}</h3>}
          <p className="text-sm mb-4 whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <Image src={post.image_url} alt="" width={800} height={400} className="rounded-lg mb-4 max-h-64 object-cover w-full" loading="lazy" />
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <button
              onClick={() => handleLike(post.id)}
              className={`flex items-center gap-1 transition-colors ${likedPosts.has(post.id) ? "text-red-500" : "hover:text-red-500"}`}
            >
              <Heart className={`h-4 w-4 ${likedPosts.has(post.id) ? "fill-red-500" : ""}`} />
              {post.likes_count + (likedPosts.has(post.id) ? 1 : 0)}
            </button>
            <button onClick={() => handleExpandComments(post.id)} className="flex items-center gap-1 hover:text-brand transition-colors">
              <MessageCircle className="h-4 w-4" />
              Commenter
            </button>
          </div>
          {expandedComments === post.id && (
            <div className="mt-4 border-t pt-4 space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                    {c.author?.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-xs font-medium">{c.author?.full_name || "Anonyme"}</p>
                    <p className="text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter un commentaire..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment(post.id)}
                  className="flex-1"
                />
                <Button size="sm" onClick={() => handleAddComment(post.id)}>
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
      <PageHeader title="Communaut\u00e9" description="\u00c9changez avec les autres membres">
        <div className="flex gap-2">
          <Link href="/community/events">
            <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />\u00c9v\u00e9nements</Button>
          </Link>
          <Link href="/community/members">
            <Button variant="outline" size="sm"><Users className="h-4 w-4 mr-2" />Membres</Button>
          </Link>
          {isAdmin && (
            <Link href="/community/manage">
              <Button variant="outline" size="sm"><Settings2 className="h-4 w-4 mr-2" />Mod\u00e9ration</Button>
            </Link>
          )}
          <Button onClick={() => { setNewChannel(activeChannel === "all" ? "general" : activeChannel); setDialogOpen(true); }} className="bg-brand text-brand-dark hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau post
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Channel sidebar ─── */}
        <div className="lg:w-60 shrink-0">
          <div className="sticky top-20">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 px-2">Canaux</h3>
            <nav className="space-y-1">
              {visibleChannels.map((ch) => {
                const isActive = activeChannel === ch.id;
                const count = ch.id === "all"
                  ? channelCounts.all || 0
                  : channelCounts[ch.id] || 0;

                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all ${
                      isActive
                        ? `bg-accent/50 border-l-2 ${ch.borderColor} font-medium`
                        : "hover:bg-accent/30 border-l-2 border-transparent"
                    }`}
                  >
                    <span className={`flex h-7 w-7 items-center justify-center rounded-md ${ch.bgColor} ${ch.color}`}>
                      {ch.icon}
                    </span>
                    <span className="flex-1 truncate">
                      <span className="block leading-tight">{ch.label}</span>
                      {ch.private && (
                        <span className="text-[10px] text-purple-400 flex items-center gap-0.5 mt-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" /> Priv\u00e9
                        </span>
                      )}
                    </span>
                    {count > 0 && (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[22px] text-center">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* ─── Main content ─── */}
        <div className="flex-1 min-w-0">
          {/* Active channel header */}
          {activeChannel !== "all" && (
            <div className={`flex items-center gap-3 mb-5 p-4 rounded-lg border ${activeChannelDef.bgColor}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeChannelDef.bgColor} ${activeChannelDef.color}`}>
                {activeChannelDef.icon}
              </span>
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  {activeChannelDef.label}
                  {activeChannelDef.private && (
                    <Badge variant="outline" className="text-[10px] border-purple-500/30 text-purple-500">
                      <ShieldCheck className="h-3 w-3 mr-0.5" /> Priv\u00e9
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground">{activeChannelDef.description}</p>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="all">Tout</TabsTrigger>
              <TabsTrigger value="win"><Trophy className="h-4 w-4 mr-1" />Wins</TabsTrigger>
              <TabsTrigger value="question">Questions</TabsTrigger>
              <TabsTrigger value="discussion">Discussions</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4">
                {filtered.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            </TabsContent>

            <TabsContent value="win">
              <div className="grid md:grid-cols-2 gap-4">
                {filtered.map((post) => <PostCard key={post.id} post={post} isWinGrid />)}
              </div>
            </TabsContent>

            <TabsContent value="question">
              <div className="space-y-4">
                {filtered.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            </TabsContent>

            <TabsContent value="discussion">
              <div className="space-y-4">
                {filtered.map((post) => <PostCard key={post.id} post={post} />)}
              </div>
            </TabsContent>
          </Tabs>

          {filtered.length === 0 && (
            <Card className="mt-4">
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucun post dans ce canal</p>
                <p className="text-sm">Soyez le premier \u00e0 publier !</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ─── Leaderboard sidebar ─── */}
        {leaderboard.length > 0 && (
          <div className="lg:w-72 shrink-0">
            <LeaderboardCard entries={leaderboard} />
          </div>
        )}
      </div>

      {/* ─── New post dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Channel selector */}
            <div>
              <Label>Canal</Label>
              <Select
                value={newChannel}
                onValueChange={(v) => setNewChannel(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visibleChannels.filter((ch) => ch.id !== "all").map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      <span className="flex items-center gap-2">
                        {ch.label}
                        {ch.private && <ShieldCheck className="h-3 w-3 text-purple-500" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discussion">Discussion</SelectItem>
                  <SelectItem value="win">Win</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titre (optionnel)</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            </div>
            <div>
              <Label>Contenu</Label>
              <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={5} />
            </div>
            {/* Image upload */}
            <div>
              <Label>Image (optionnel)</Label>
              {newImagePreview ? (
                <div className="relative mt-2">
                  <img src={newImagePreview} alt="Aper\u00e7u" className="w-full rounded-lg max-h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => { setNewImageUrl(""); setNewImagePreview(""); }}
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-4 text-sm text-muted-foreground hover:border-brand hover:text-brand transition-colors"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploadingImage ? "Upload en cours..." : "Ajouter une image"}
                </button>
              )}
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            <Button onClick={handleCreate} disabled={isPosting || !newContent.trim()} className="w-full bg-brand text-brand-dark hover:bg-brand/90">
              {isPosting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Publier
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
