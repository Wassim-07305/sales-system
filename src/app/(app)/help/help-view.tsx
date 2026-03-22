"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Search,
  BookOpen,
  Rocket,
  Kanban,
  Target,
  FileText,
  BarChart3,
  Trophy,
  MessageSquare,
  Settings,
  ArrowRight,
  Mail,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/layout/page-header";
import type { HelpCategory, HelpArticle, FAQItem } from "@/lib/actions/help";

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  Kanban,
  Target,
  FileText,
  BarChart3,
  Trophy,
  MessageSquare,
  Settings,
};

interface HelpViewProps {
  categories: HelpCategory[];
  articles: HelpArticle[];
  popularArticles: HelpArticle[];
  faq: FAQItem[];
}

export function HelpView({
  categories,
  articles,
  popularArticles,
  faq,
}: HelpViewProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredArticles = useMemo(() => {
    let result = articles;

    if (selectedCategory) {
      result = result.filter((a) => a.categoryId === selectedCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q),
      );
    }

    return result;
  }, [articles, search, selectedCategory]);

  const showResults = search.trim().length > 0 || selectedCategory !== null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Centre d'aide"
        description="Trouvez des réponses à vos questions et apprenez à utiliser la plateforme"
      />

      {/* Search bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          placeholder="Rechercher dans le centre d'aide..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value.trim()) setSelectedCategory(null);
          }}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Search / Category results */}
      {showResults && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedCategory
                ? `Articles — ${categories.find((c) => c.id === selectedCategory)?.name}`
                : `Résultats de recherche`}
              <span className="text-muted-foreground font-normal ml-2">
                ({filteredArticles.length})
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedCategory(null);
              }}
            >
              Tout afficher
            </Button>
          </div>

          {filteredArticles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <HelpCircle className="size-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucun article trouvé. Essayez avec d&apos;autres termes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filteredArticles.map((article) => (
                <Link key={article.id} href={`/help/${article.id}`}>
                  <Card className="hover:border-[#10b981]/50 transition-colors cursor-pointer">
                    <CardContent className="flex items-start gap-4 py-4">
                      <BookOpen className="size-5 text-[#10b981] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {article.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                          >
                            {article.categoryName}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                      </div>
                      <ArrowRight className="size-4 text-muted-foreground mt-1 shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      {!showResults && (
        <>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="size-5 text-[#10b981]" />
              Articles populaires
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {popularArticles.map((article) => (
                <Link key={article.id} href={`/help/${article.id}`}>
                  <Card className="hover:border-[#10b981]/50 transition-colors cursor-pointer h-full">
                    <CardContent className="flex items-start gap-3 py-4">
                      <BookOpen className="size-5 text-[#10b981] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm leading-snug mb-1">
                          {article.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {article.excerpt}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Categories grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Catégories</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((category) => {
                const Icon = ICON_MAP[category.icon] || HelpCircle;
                return (
                  <Card
                    key={category.id}
                    className="hover:border-[#10b981]/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSearch("");
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center size-10 rounded-lg bg-[#10b981]/10">
                          <Icon className="size-5 text-[#10b981]" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">
                            {category.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {category.articleCount} articles
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* FAQ section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="size-5 text-[#10b981]" />
              Questions fréquentes
            </h2>
            <Card>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faq.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger className="text-left">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground">{item.answer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Contact support */}
          <Card className="border-[#10b981]/30 bg-[#10b981]/5">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 py-6">
              <div className="flex items-center justify-center size-12 rounded-full bg-[#10b981]/10">
                <Mail className="size-6 text-[#10b981]" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-semibold mb-1">
                  Vous ne trouvez pas de réponse ?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Notre équipe support est disponible pour vous aider.
                  Envoyez-nous un message et nous vous répondrons sous 24
                  heures.
                </p>
              </div>
              <Button className="bg-[#10b981] text-[#09090b] hover:bg-[#10b981]/90">
                <Mail className="size-4" />
                Contacter le support
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
