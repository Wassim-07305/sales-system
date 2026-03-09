import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getHelpArticle, getHelpArticles } from "@/lib/actions/help";
import { ArticleView } from "./article-view";

interface ArticlePageProps {
  params: Promise<{ articleId: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { articleId } = await params;
  const article = await getHelpArticle(articleId);
  if (!article) notFound();

  // Get related articles from same category (excluding current)
  const allInCategory = await getHelpArticles(article.categoryId);
  const relatedArticles = allInCategory
    .filter((a) => a.id !== article.id)
    .slice(0, 3);

  return <ArticleView article={article} relatedArticles={relatedArticles} />;
}
