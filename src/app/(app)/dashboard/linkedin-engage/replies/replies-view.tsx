"use client";

import { useState } from "react";
import {
  MessageCircle,
  ExternalLink,
  Sparkles,
  Loader2,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { rewriteComment } from "@/lib/actions/linkedin-engage";
import type { CommentHistory } from "@/lib/actions/linkedin-engage";

interface Props {
  comments: CommentHistory[];
}

export function RepliesView({ comments }: Props) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [generatingReply, setGeneratingReply] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleSuggestReply(comment: CommentHistory) {
    setReplyingTo(comment.id);
    setGeneratingReply(true);
    try {
      const suggestion = await rewriteComment(
        comment.comment_text,
        `Ce commentaire a reçu des réponses. Génère une réponse de suivi engageante qui continue la conversation. Le commentaire original était posté chez "${comment.creator_name}". Réponds de manière naturelle et concise (2-3 lignes).`,
      );
      setReplyText(suggestion);
    } catch {
      toast.error("Erreur de génération");
    } finally {
      setGeneratingReply(false);
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copié dans le presse-papier");
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Réponses"
        description="Gérez les conversations générées par vos commentaires"
      />

      {comments.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-1">Aucune réponse</h3>
            <p className="text-sm text-muted-foreground">
              Les réponses à vos commentaires LinkedIn apparaîtront ici une
              fois que les statistiques seront mises à jour.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className="rounded-2xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium">
                      Chez {comment.creator_name || "Créateur"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.posted_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-brand/10 text-brand border-brand/20 text-xs">
                      {comment.replies_count} réponse
                      {comment.replies_count > 1 ? "s" : ""}
                    </Badge>
                    {comment.post_url && (
                      <a
                        href={comment.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 mb-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Votre commentaire :
                  </p>
                  <p className="text-sm">{comment.comment_text}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{comment.impressions} impressions</span>
                  <span>{comment.likes_on_comment} likes</span>
                </div>

                {/* Reply section */}
                {replyingTo === comment.id ? (
                  <div className="space-y-3 border-t pt-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Votre réponse..."
                      rows={3}
                      className="rounded-xl"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-lg"
                        onClick={() =>
                          handleCopy(comment.id, replyText)
                        }
                      >
                        {copiedId === comment.id ? (
                          <Check className="h-3 w-3 mr-1" />
                        ) : (
                          <Copy className="h-3 w-3 mr-1" />
                        )}
                        Copier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-lg"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText("");
                        }}
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => setReplyingTo(comment.id)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Répondre
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg"
                      disabled={generatingReply}
                      onClick={() => handleSuggestReply(comment)}
                    >
                      {generatingReply ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3 mr-1" />
                      )}
                      Suggérer une réponse
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
