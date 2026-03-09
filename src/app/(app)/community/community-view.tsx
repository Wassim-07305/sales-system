"use client";

import { useState } from "react";
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
import { Heart, MessageCircle, Trophy, Plus, Send, Users, Settings2, Calendar } from "lucide-react";
import { createCommunityPost, toggleLike, getComments, addComment } from "@/lib/actions/community";
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
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null; niche: string | null } | null;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

const typeColors: Record<string, string> = {
  win: "bg-brand/10 text-brand-dark border-brand/30",
  question: "bg-blue-100 text-blue-700",
  discussion: "bg-gray-100 text-gray-700",
};

const typeLabels: Record<string, string> = { win: "Win", question: "Question", discussion: "Discussion" };

export function CommunityView({ posts, userId, isAdmin, leaderboard = [], reputations = {} }: { posts: Post[]; userId: string; isAdmin: boolean; leaderboard?: LeaderboardEntry[]; reputations?: Record<string, number> }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [newType, setNewType] = useState("discussion");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  const filtered = activeTab === "all" ? posts : posts.filter((p) => p.type === activeTab);

  async function handleCreate() {
    if (!newContent.trim()) return;
    try {
      await createCommunityPost({ type: newType, title: newTitle || undefined, content: newContent });
      toast.success("Post publié !");
      setDialogOpen(false);
      setNewContent("");
      setNewTitle("");
      router.refresh();
    } catch {
      toast.error("Erreur");
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
    return (
      <Card className={`${post.type === "win" && isWinGrid ? "border-green-300 bg-green-50/50" : ""}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
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
            <Badge variant="outline" className={`ml-auto ${typeColors[post.type]}`}>
              {post.type === "win" && <Trophy className="h-3 w-3 mr-1" />}
              {typeLabels[post.type]}
            </Badge>
          </div>
          {post.title && <h3 className="font-semibold mb-2">{post.title}</h3>}
          <p className="text-sm mb-4 whitespace-pre-wrap">{post.content}</p>
          {post.image_url && (
            <img src={post.image_url} alt="" className="rounded-lg mb-4 max-h-64 object-cover w-full" />
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
      <PageHeader title="Communauté" description="Échangez avec les autres membres">
        <div className="flex gap-2">
          <Link href="/community/events">
            <Button variant="outline" size="sm"><Calendar className="h-4 w-4 mr-2" />Événements</Button>
          </Link>
          <Link href="/community/members">
            <Button variant="outline" size="sm"><Users className="h-4 w-4 mr-2" />Membres</Button>
          </Link>
          {isAdmin && (
            <Link href="/community/manage">
              <Button variant="outline" size="sm"><Settings2 className="h-4 w-4 mr-2" />Modération</Button>
            </Link>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-brand text-brand-dark hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau post
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
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
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Aucun post</p>
                <p className="text-sm">Soyez le premier à publier !</p>
              </CardContent>
            </Card>
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="lg:w-72 shrink-0">
            <LeaderboardCard entries={leaderboard} />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <Button onClick={handleCreate} className="w-full bg-brand text-brand-dark hover:bg-brand/90">Publier</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
