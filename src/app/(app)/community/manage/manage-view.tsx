"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  hidePost,
  unhidePost,
  deleteCommunityPost,
} from "@/lib/actions/community";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Post {
  id: string;
  type: string;
  title: string | null;
  content: string;
  hidden: boolean;
  created_at: string;
  author: { id: string; full_name: string | null } | null;
}

export function ManageView({ posts }: { posts: Post[] }) {
  const router = useRouter();

  async function handleHide(id: string) {
    await hidePost(id);
    toast.success("Post masqué");
    router.refresh();
  }

  async function handleUnhide(id: string) {
    await unhidePost(id);
    toast.success("Post visible");
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.",
      )
    )
      return;
    await deleteCommunityPost(id);
    toast.success("Post supprimé");
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Modération"
        description={`${posts.length} posts au total`}
      >
        <Link href="/community">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <div className="space-y-3">
        {posts.map((post) => (
          <Card key={post.id} className={post.hidden ? "opacity-50" : ""}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {post.author?.full_name || "Anonyme"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {post.type}
                  </Badge>
                  {post.hidden && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20"
                    >
                      Masqué
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {post.content}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {post.hidden ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleUnhide(post.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleHide(post.id)}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500"
                  onClick={() => handleDelete(post.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Eye className="h-7 w-7 opacity-50" />
            </div>
            <p className="font-medium">Aucun post à modérer</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
