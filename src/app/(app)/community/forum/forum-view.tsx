"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Heart,
  Pin,
  Plus,
  ArrowLeft,
  BookOpen,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCommunityPost } from "@/lib/actions/community";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ReputationBadge } from "@/components/community/reputation-badge";

interface Post {
  id: string;
  author_id: string | null;
  type: string;
  title: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  is_pinned: boolean;
  module_id: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    niche: string | null;
  } | null;
}

interface Module {
  id: string;
  title: string;
}

interface Props {
  posts: Post[];
  modules: Module[];
  userId: string;
  reputations?: Record<string, number>;
}

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function getAvatarColor(name: string | null | undefined) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string | null | undefined) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ForumView({ posts, modules, userId, reputations = {} }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newModuleId, setNewModuleId] = useState("");

  const pinnedPosts = posts.filter((p) => p.is_pinned);
  const filtered =
    activeTab === "all"
      ? posts.filter((p) => !p.is_pinned)
      : posts.filter((p) => p.module_id === activeTab && !p.is_pinned);

  function handleCreate() {
    if (!newContent.trim() || !newTitle.trim()) {
      toast.error("Veuillez remplir le titre et le contenu");
      return;
    }
    startTransition(async () => {
      try {
        await createCommunityPost({
          type: "discussion",
          title: newTitle,
          content: newContent,
          image_url: undefined,
        });
        toast.success("Sujet créé !");
        setDialogOpen(false);
        setNewTitle("");
        setNewContent("");
        setNewModuleId("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la création");
      }
    });
  }

  function getModuleName(moduleId: string | null) {
    if (!moduleId) return null;
    const mod = modules.find((m) => m.id === moduleId);
    return mod?.title || null;
  }

  return (
    <div>
      <PageHeader title="Forum" description="Discussions par module">
        <div className="flex gap-2">
          <Link href="/community">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Communauté
            </Button>
          </Link>
          <Link href="/community/search">
            <Button variant="outline" size="sm">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </Link>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
            className="h-9 bg-emerald-500 text-black hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau sujet
          </Button>
        </div>
      </PageHeader>

      {/* Pinned posts */}
      {pinnedPosts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Épinglés
          </h2>
          <div className="space-y-2">
            {pinnedPosts.map((post) => (
              <Link key={post.id} href={`/community/forum/${post.id}`}>
                <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Pin className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {post.title || "Sans titre"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{post.author?.full_name || "Anonyme"}</span>
                        {post.author?.id &&
                          reputations[post.author.id] !== undefined && (
                            <ReputationBadge
                              score={reputations[post.author.id]}
                            />
                          )}
                        <span>&middot;</span>
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </p>
                    </div>
                    {post.module_id && (
                      <Badge
                        variant="outline"
                        className="shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        {getModuleName(post.module_id)}
                      </Badge>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes_count}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Category tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="all">Tous</TabsTrigger>
          {modules.map((mod) => (
            <TabsTrigger key={mod.id} value={mod.id}>
              {mod.title}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="space-y-3">
            {filtered.map((post) => (
              <Link key={post.id} href={`/community/forum/${post.id}`}>
                <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer mb-3">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0",
                          getAvatarColor(post.author?.full_name),
                        )}
                      >
                        {getInitials(post.author?.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">
                            {post.title || "Sans titre"}
                          </h3>
                          {post.module_id && (
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0 bg-blue-500/10 text-blue-600 border-blue-500/20"
                            >
                              <BookOpen className="h-3 w-3 mr-1" />
                              {getModuleName(post.module_id)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {post.author?.full_name || "Anonyme"}
                            {post.author?.id &&
                              reputations[post.author.id] !== undefined && (
                                <ReputationBadge
                                  score={reputations[post.author.id]}
                                />
                              )}
                          </span>
                          <span>
                            {formatDistanceToNow(new Date(post.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {post.likes_count}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {filtered.length === 0 && (
              <Card className="border-border/50">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-7 w-7 opacity-50" />
                  </div>
                  <p className="font-medium">
                    Aucun sujet dans cette catégorie
                  </p>
                  <p className="text-sm mt-1">
                    Créez le premier sujet de discussion !
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create thread dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau sujet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Titre
              </Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Sujet de discussion..."
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Module (optionnel)
              </Label>
              <Select value={newModuleId} onValueChange={setNewModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Contenu
              </Label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
                placeholder="Écrivez votre message..."
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={isPending}
              className="w-full h-9 bg-emerald-500 text-black hover:bg-emerald-400"
            >
              {isPending ? "Publication..." : "Publier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
