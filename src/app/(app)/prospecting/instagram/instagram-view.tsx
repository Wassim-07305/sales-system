"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Instagram,
  Search,
  Sparkles,
  Loader2,
  Users,
  Wrench,
  ExternalLink,
  Copy,
  Eye,
  Video,
  Image as ImageIcon,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import {
  scrapeStories,
  generateAiMessage,
} from "@/lib/actions/hub-setting";
import { updateProspectStatus } from "@/lib/actions/prospecting";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Prospect {
  id: string;
  name: string;
  profile_url: string | null;
  platform: string;
  status: string;
  created_at: string;
  updated_at?: string;
  list: { id: string; name: string } | null;
}

interface Story {
  id: string;
  username: string;
  type: "image" | "video";
  timestamp: string;
  caption: string;
  hasQuestion: boolean;
  questionText?: string;
  hasPoll: boolean;
  pollQuestion?: string;
}

interface Props {
  prospects: Prospect[];
}

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  replied: "Répondu",
  interested: "Intéressé",
  booked: "RDV pris",
  converted: "Converti",
  lost: "Perdu",
};

const statusColors: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-green-100 text-green-700",
  interested: "bg-purple-100 text-purple-700",
  booked: "bg-brand/20 text-brand-dark",
  converted: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

export function InstagramView({ prospects }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Story scraper
  const [storyUsername, setStoryUsername] = useState("");
  const [stories, setStories] = useState<Story[]>([]);
  const [scrapingStories, setScrapingStories] = useState(false);

  // DM generator
  const [dmName, setDmName] = useState("");
  const [dmContext, setDmContext] = useState("");
  const [generatedDm, setGeneratedDm] = useState("");
  const [generatingDm, setGeneratingDm] = useState(false);

  const filteredProspects = prospects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  async function handleScrapeStories() {
    if (!storyUsername.trim()) {
      toast.error("Entrez un nom d'utilisateur Instagram");
      return;
    }
    setScrapingStories(true);
    try {
      const result = await scrapeStories(storyUsername.replace("@", ""));
      setStories(result as Story[]);
      toast.success(`${result.length} stories trouvées`);
    } catch {
      toast.error("Erreur lors du scraping des stories");
    } finally {
      setScrapingStories(false);
    }
  }

  async function handleGenerateDm() {
    if (!dmName.trim() || !dmContext.trim()) {
      toast.error("Remplissez tous les champs");
      return;
    }
    setGeneratingDm(true);
    try {
      const msg = await generateAiMessage(dmName, dmContext, "instagram");
      setGeneratedDm(msg);
      toast.success("Message Instagram généré");
    } catch {
      toast.error("Erreur de génération");
    } finally {
      setGeneratingDm(false);
    }
  }

  async function handleStatusChange(prospectId: string, newStatus: string) {
    startTransition(async () => {
      try {
        await updateProspectStatus(prospectId, newStatus);
        toast.success("Statut mis à jour");
        router.refresh();
      } catch {
        toast.error("Erreur de mise à jour");
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  }

  return (
    <div>
      <PageHeader
        title="Instagram"
        description="Prospection et outils Instagram"
      >
        <Badge variant="outline" className="bg-pink-50 text-pink-700 gap-1">
          <Instagram className="h-3 w-3" />
          {prospects.length} prospects
        </Badge>
      </PageHeader>

      <Tabs defaultValue="outils">
        <TabsList className="mb-6">
          <TabsTrigger value="outils">
            <Wrench className="h-4 w-4 mr-2" />
            Outils
          </TabsTrigger>
          <TabsTrigger value="prospects">
            <Users className="h-4 w-4 mr-2" />
            Prospects ({prospects.length})
          </TabsTrigger>
        </TabsList>

        {/* Tools Tab */}
        <TabsContent value="outils">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Story Scraper */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Scraper de stories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="@nomutilisateur"
                  value={storyUsername}
                  onChange={(e) => setStoryUsername(e.target.value)}
                />
                <Button
                  onClick={handleScrapeStories}
                  disabled={scrapingStories}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  {scrapingStories ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Scanner les stories
                </Button>

                {stories.length > 0 && (
                  <ScrollArea className="max-h-72">
                    <div className="space-y-3">
                      {stories.map((story) => (
                        <div
                          key={story.id}
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {story.type === "video" ? (
                                <Video className="h-4 w-4 text-purple-500" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-blue-500" />
                              )}
                              <span className="text-sm font-medium capitalize">
                                {story.type}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(story.timestamp), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          </div>
                          <p className="text-sm">{story.caption}</p>
                          <div className="flex gap-2">
                            {story.hasPoll && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-orange-50 text-orange-700"
                              >
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Sondage : {story.pollQuestion}
                              </Badge>
                            )}
                            {story.hasQuestion && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-purple-50 text-purple-700"
                              >
                                <HelpCircle className="h-3 w-3 mr-1" />
                                Question : {story.questionText}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* DM Generator (Instagram tone) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Générateur de DM Instagram
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Nom du prospect
                  </label>
                  <Input
                    placeholder="Marie Martin"
                    value={dmName}
                    onChange={(e) => setDmName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Contexte / Accroche
                  </label>
                  <Input
                    placeholder="Ex: j'ai adoré ta dernière story sur le bien-être"
                    value={dmContext}
                    onChange={(e) => setDmContext(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleGenerateDm}
                  disabled={generatingDm}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  {generatingDm ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Générer le DM
                </Button>

                {generatedDm && (
                  <div className="border rounded-lg p-4">
                    <pre className="whitespace-pre-wrap text-sm font-sans mb-3">
                      {generatedDm}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedDm)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copier le message
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prospects Tab */}
        <TabsContent value="prospects">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prospect Instagram..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="new">Nouveau</SelectItem>
                <SelectItem value="contacted">Contacté</SelectItem>
                <SelectItem value="replied">Répondu</SelectItem>
                <SelectItem value="interested">Intéressé</SelectItem>
                <SelectItem value="booked">RDV pris</SelectItem>
                <SelectItem value="converted">Converti</SelectItem>
                <SelectItem value="lost">Perdu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredProspects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-400 via-red-400 to-yellow-400 flex items-center justify-center text-white font-bold">
                        {prospect.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{prospect.name}</p>
                          {prospect.profile_url && (
                            <a
                              href={prospect.profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-pink-600"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {prospect.list?.name || "Sans liste"} &middot;{" "}
                          {formatDistanceToNow(new Date(prospect.created_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Select
                        value={prospect.status}
                        onValueChange={(val) =>
                          handleStatusChange(prospect.id, val)
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <Badge
                            className={`${
                              statusColors[prospect.status] || ""
                            } text-xs`}
                          >
                            {statusLabels[prospect.status] || prospect.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {filteredProspects.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <Instagram className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun prospect Instagram trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
