"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, ThumbsUp, ThumbsDown, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/actions/help";
import type { HelpArticle } from "@/lib/actions/help";

interface ArticleViewProps {
  article: HelpArticle;
  relatedArticles: HelpArticle[];
}

export function ArticleView({ article, relatedArticles }: ArticleViewProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  async function handleFeedback(helpful: boolean) {
    try {
      await submitFeedback(article.id, helpful);
      setFeedbackGiven(helpful);
      toast.success("Merci pour votre retour !", {
        style: { background: "#14080e", border: "1px solid #333" },
      });
    } catch {
      toast.error("Une erreur est survenue", {
        style: { background: "#14080e", border: "1px solid #333" },
      });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/help"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Retour au centre d&apos;aide
      </Link>

      {/* Article header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{article.categoryName}</Badge>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="size-3" />
            Mis à jour le{" "}
            {new Date(article.updatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{article.title}</h1>
        <p className="text-muted-foreground">{article.excerpt}</p>
      </div>

      {/* Article content */}
      <Card>
        <CardContent className="py-6">
          <div
            className="prose prose-invert prose-sm max-w-none
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-[#7af17a] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card className="border-[#7af17a]/20">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
          <p className="font-medium text-sm">
            Cet article vous a-t-il été utile ?
          </p>
          {feedbackGiven === null ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback(true)}
                className="gap-2"
              >
                <ThumbsUp className="size-4" />
                Oui
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback(false)}
                className="gap-2"
              >
                <ThumbsDown className="size-4" />
                Non
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Merci pour votre retour !
            </p>
          )}
        </CardContent>
      </Card>

      {/* Related articles */}
      {relatedArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="size-5 text-[#7af17a]" />
            Articles connexes
          </h2>
          <div className="grid gap-3">
            {relatedArticles.map((related) => (
              <Link key={related.id} href={`/help/${related.id}`}>
                <Card className="hover:border-[#7af17a]/50 transition-colors cursor-pointer">
                  <CardContent className="flex items-center gap-3 py-4">
                    <BookOpen className="size-4 text-[#7af17a] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium truncate">
                        {related.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {related.excerpt}
                      </p>
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
