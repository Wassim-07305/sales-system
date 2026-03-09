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
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau sujet
          </Button>
        </div>
      </PageHeader>

      {/* Pinned posts */}
      {pinnedPosts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Pin className="h-4 w-4" />
            Épinglés
          </h2>
          <div className="space-y-2">
            {pinnedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/community/forum/${post.id}`}
              >
                <Card className="hover:border-brand/30 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Pin className="h-4 w-4 text-brand shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {post.title || "Sans titre"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span>{post.author?.full_name || "Anonyme"}</span>
                        {post.author?.id && reputations[post.author.id] !== undefined && (
                          <ReputationBadge score={reputations[post.author.id]} />
                        )}
                        <span>&middot;</span>
                        <span>{formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}</span>
                      </p>
                    </div>
                    {post.module_id && (
                      <Badge variant="outline" className="shrink-0">
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
              <Link
                key={post.id}
                href={`/community/forum/${post.id}`}
              >
                <Card className="hover:border-brand/30 transition-colors cursor-pointer mb-3">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-bold shrink-0">
                        {post.author?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">
                            {post.title || "Sans titre"}
                          </h3>
                          {post.module_id && (
                            <Badge
                              variant="outline"
                              className="text-xs shrink-0"
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
                            {post.author?.id && reputations[post.author.id] !== undefined && (
                              <ReputationBadge score={reputations[post.author.id]} />
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
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Aucun sujet dans cette catégorie</p>
                  <p className="text-sm">
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
              <Label>Titre</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Sujet de discussion..."
              />
            </div>
            <div className="space-y-2">
              <Label>Module (optionnel)</Label>
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
              <Label>Contenu</Label>
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
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isPending ? "Publication..." : "Publier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
