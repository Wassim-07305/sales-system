"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, ArrowLeft, Send, MessageCircle } from "lucide-react";
import { toggleLike, addComment } from "@/lib/actions/community";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
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
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    niche: string | null;
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

interface Props {
  post: Post;
  comments: Comment[];
  userId: string;
  reputations?: Record<string, number>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ThreadView({ post, comments, userId, reputations = {} }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState("");

  function handleLike() {
    setLiked(!liked);
    startTransition(async () => {
      await toggleLike(post.id, !liked);
      router.refresh();
    });
  }

  function handleAddComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      try {
        await addComment(post.id, commentText);
        setCommentText("");
        toast.success("Commentaire ajouté");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'ajout du commentaire");
      }
    });
  }

  return (
    <div>
      <PageHeader title={post.title || "Discussion"} description="">
        <Link href="/community/forum">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au forum
          </Button>
        </Link>
      </PageHeader>

      {/* Original post */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand text-sm font-bold">
              {post.author?.full_name?.charAt(0) || "?"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-medium">
                  {post.author?.full_name || "Anonyme"}
                </p>
                {post.author?.id && reputations[post.author.id] !== undefined && (
                  <ReputationBadge score={reputations[post.author.id]} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), "d MMMM yyyy 'à' HH:mm", {
                  locale: fr,
                })}
              </p>
            </div>
          </div>

          <div className="prose prose-sm max-w-none mb-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {post.content}
            </p>
          </div>

          {post.image_url && (
            <img
              src={post.image_url}
              alt=""
              className="rounded-lg mb-4 max-h-96 object-cover w-full"
            />
          )}

          <div className="flex items-center gap-4 pt-4 border-t">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"
              }`}
            >
              <Heart
                className={`h-4 w-4 ${liked ? "fill-red-500" : ""}`}
              />
              {post.likes_count + (liked ? 1 : 0)}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {comments.length} commentaire{comments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Comments section */}
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-brand" />
        Commentaires ({comments.length})
      </h2>

      <div className="space-y-3 mb-6">
        {comments.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {c.author?.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {c.author?.full_name || "Anonyme"}
                    </p>
                    {c.author?.id && reputations[c.author.id] !== undefined && (
                      <ReputationBadge score={reputations[c.author.id]} />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {comments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun commentaire. Soyez le premier !</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reply input */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
              ?
            </div>
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Écrire un commentaire..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={isPending || !commentText.trim()}
                className="bg-brand text-brand-dark hover:bg-brand/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
