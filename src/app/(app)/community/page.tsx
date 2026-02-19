"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trophy, Plus } from "lucide-react";

const mockPosts = [
  {
    author: "Pierre D.",
    type: "win",
    content: "Premier closing à 3 500 € cette semaine ! La méthode fonctionne.",
    likes: 12,
    comments: 4,
    time: "Il y a 2h",
  },
  {
    author: "Marie L.",
    type: "question",
    content: "Comment gérez-vous l'objection 'je vais réfléchir' en closing ? Des tips ?",
    likes: 8,
    comments: 6,
    time: "Il y a 5h",
  },
  {
    author: "Alex M.",
    type: "discussion",
    content: "Retour d'expérience sur le module prospection : j'ai doublé mon taux de réponse en appliquant la séquence DM en 4 étapes.",
    likes: 15,
    comments: 3,
    time: "Hier",
  },
];

const typeColors: Record<string, string> = {
  win: "bg-brand/10 text-brand-dark",
  question: "bg-blue-100 text-blue-700",
  discussion: "bg-gray-100 text-gray-700",
};

const typeLabels: Record<string, string> = {
  win: "Win",
  question: "Question",
  discussion: "Discussion",
};

export default function CommunityPage() {
  return (
    <div>
      <PageHeader
        title="Communauté"
        description="Échangez avec les autres membres Sales System"
      >
        <Button className="bg-brand text-brand-dark hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau post
        </Button>
      </PageHeader>

      <Tabs defaultValue="all">
        <TabsList className="mb-6">
          <TabsTrigger value="all">Tout</TabsTrigger>
          <TabsTrigger value="wins">
            <Trophy className="h-4 w-4 mr-1" />
            Wins
          </TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-4">
            {mockPosts.map((post, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                      {post.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{post.author}</p>
                      <p className="text-xs text-muted-foreground">{post.time}</p>
                    </div>
                    <Badge variant="outline" className={`ml-auto ${typeColors[post.type]}`}>
                      {post.type === "win" && <Trophy className="h-3 w-3 mr-1" />}
                      {typeLabels[post.type]}
                    </Badge>
                  </div>
                  <p className="text-sm mb-4">{post.content}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
                      <Heart className="h-4 w-4" />
                      {post.likes}
                    </button>
                    <button className="flex items-center gap-1 hover:text-brand transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      {post.comments}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="wins">
          <div className="space-y-4">
            {mockPosts
              .filter((p) => p.type === "win")
              .map((post, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                        {post.author.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{post.author}</p>
                        <p className="text-xs text-muted-foreground">{post.time}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto bg-brand/10 text-brand-dark">
                        <Trophy className="h-3 w-3 mr-1" />
                        Win
                      </Badge>
                    </div>
                    <p className="text-sm">{post.content}</p>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="questions">
          <div className="text-center py-8 text-muted-foreground">
            Les questions de la communauté apparaîtront ici.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
