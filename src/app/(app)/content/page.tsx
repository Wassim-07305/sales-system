"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Instagram, Linkedin, Youtube } from "lucide-react";

const mockPosts = [
  {
    title: "5 erreurs qui tuent vos appels de closing",
    platform: "linkedin",
    framework: "educational",
    status: "published",
    date: "18 Fév 2026",
  },
  {
    title: "Mon client est passé de 0 à 10 RDV/semaine",
    platform: "instagram",
    framework: "testimonial",
    status: "scheduled",
    date: "20 Fév 2026",
  },
  {
    title: "La méthode SPIN pour qualifier un prospect",
    platform: "youtube",
    framework: "educational",
    status: "draft",
    date: "—",
  },
];

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  published: "bg-green-100 text-green-700",
};

export default function ContentPage() {
  return (
    <div>
      <PageHeader
        title="Content Planner"
        description="Planifiez et suivez votre contenu"
      >
        <Button className="bg-brand text-brand-dark hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau post
        </Button>
      </PageHeader>

      <div className="space-y-3">
        {mockPosts.map((post, i) => (
          <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  {platformIcons[post.platform]}
                </div>
                <div>
                  <p className="font-medium">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {post.framework}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.date}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={statusColors[post.status]}>
                {post.status === "draft"
                  ? "Brouillon"
                  : post.status === "scheduled"
                  ? "Planifié"
                  : "Publié"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
