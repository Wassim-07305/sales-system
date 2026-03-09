import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getHelpCategories, getHelpArticles, getFAQ } from "@/lib/actions/help";
import { HelpView } from "./help-view";

export default async function HelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [categories, articles, faq] = await Promise.all([
    getHelpCategories(),
    getHelpArticles(),
    getFAQ(),
  ]);

  const popularArticles = articles.filter((a) => a.popular);

  return (
    <HelpView
      categories={categories}
      articles={articles}
      popularArticles={popularArticles}
      faq={faq}
    />
  );
}
