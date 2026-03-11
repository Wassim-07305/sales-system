"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, MessageSquare, ArrowLeft } from "lucide-react";
import { searchCommunity } from "@/lib/actions/community";
import Link from "next/link";

interface PostResult {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CommentResult {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  post: {
    id: string;
    title: string | null;
  } | null;
}

export function CommunitySearchView() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [comments, setComments] = useState<CommentResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setPosts([]);
      setComments([]);
      setHasSearched(false);
      return;
    }

    startTransition(async () => {
      try {
        const results = await searchCommunity(debouncedQuery);
        setPosts(results.posts as PostResult[]);
        setComments(results.comments as CommentResult[]);
        setHasSearched(true);
      } catch {
        setPosts([]);
        setComments([]);
      }
    });
  }, [debouncedQuery]);

  return (
    <div>
      <PageHeader title="Rechercher" description="Rechercher dans la communaute">
        <Link href="/community">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Communaute
          </Button>
        </Link>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher des posts ou commentaires..."
          className="pl-10"
        />
      </div>

      {isPending && (
        <p className="text-sm text-muted-foreground mb-4">Recherche en cours...</p>
      )}

      {hasSearched && posts.length === 0 && comments.length === 0 && !isPending && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Aucun resultat</p>
            <p className="text-sm">Essayez avec d&apos;autres mots-cles</p>
          </CardContent>
        </Card>
      )}

      {posts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Posts
            <Badge variant="secondary">{posts.length}</Badge>
          </h2>
          <div className="space-y-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/community/forum/${post.id}`}>
                <Card className="hover:border-brand/30 transition-colors cursor-pointer mb-3">
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{post.title || "Sans titre"}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {post.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.author?.full_name || "Anonyme"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {comments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Commentaires
            <Badge variant="secondary">{comments.length}</Badge>
          </h2>
          <div className="space-y-3">
            {comments.map((comment) => (
              <Link
                key={comment.id}
                href={comment.post ? `/community/forum/${comment.post.id}` : "#"}
              >
                <Card className="hover:border-brand/30 transition-colors cursor-pointer mb-3">
                  <CardContent className="p-4">
                    <p className="text-sm line-clamp-2 mb-2">{comment.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{comment.author?.full_name || "Anonyme"}</span>
                      {comment.post && (
                        <>
                          <span>&middot;</span>
                          <span>dans : {comment.post.title || "Sans titre"}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
