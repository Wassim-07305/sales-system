"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
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
  Bot,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
  AlertTriangle,
  Send,
  Wand2,
  MessageCircle,
  UserPlus,
  Check,
} from "lucide-react";
import { scrapeStories, generateAiMessage } from "@/lib/actions/hub-setting";
// searchInstagramProfiles imported but replaced by API route for async polling
import { createProspect } from "@/lib/actions/prospects";
import {
  generateUnipileAuthLink,
  getUnipileStatus,
} from "@/lib/actions/unipile";
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
  unipileInstagram?: { connected: boolean; accountName?: string } | null;
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
  new: "bg-muted text-muted-foreground",
  contacted: "bg-muted/40 text-muted-foreground/60 border border-border/30",
  replied: "bg-brand/10 text-brand border border-brand/20",
  interested: "bg-foreground/10 text-foreground border border-foreground/20",
  booked: "bg-brand/20 text-brand-dark",
  converted: "bg-brand/10 text-brand border border-brand/20",
  lost: "bg-foreground/10 text-foreground border border-foreground/20",
};

export function InstagramView({ prospects, unipileInstagram }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Unipile state
  const [connectingUnipile, setConnectingUnipile] = useState(false);
  const [igConnected, setIgConnected] = useState(
    unipileInstagram?.connected ?? false,
  );
  const [igName, setIgName] = useState(unipileInstagram?.accountName ?? "");
  const [refreshingUnipile, setRefreshingUnipile] = useState(false);

  async function handleConnectUnipile() {
    setConnectingUnipile(true);
    try {
      const result = await generateUnipileAuthLink("INSTAGRAM");
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        window.open(
          result.url,
          "_blank",
          "width=600,height=700,scrollbars=yes",
        );
        toast.info("Connectez votre compte Instagram, puis cliquez Rafraîchir");
      }
    } catch {
      toast.error("Erreur lors de la génération du lien");
    }
    setConnectingUnipile(false);
  }

  async function handleRefreshUnipile() {
    setRefreshingUnipile(true);
    try {
      const result = await getUnipileStatus();
      const igAccount = result.accounts.find(
        (a) => a.provider.toUpperCase() === "INSTAGRAM",
      );
      setIgConnected(!!igAccount);
      setIgName(igAccount?.name ?? "");
      toast.success(
        igAccount
          ? "Instagram connecté via Unipile"
          : "Aucun compte Instagram détecté",
      );
    } catch {
      toast.error("Erreur lors du rafraîchissement");
    }
    setRefreshingUnipile(false);
  }

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

  // Story reaction generator
  const [storyUrl, setStoryUrl] = useState("");
  const [storyReaction, setStoryReaction] = useState("");
  const [generatingReaction, setGeneratingReaction] = useState(false);

  // Instagram search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; username: string | null; biography: string | null; source: string; profile_url?: string | null; followers_count?: number | null; profile_picture_url?: string | null }>
  >([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleSearchInstagram() {
    if (!searchQuery.trim()) {
      toast.error("Entrez un terme de recherche");
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch("/api/instagram-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      const result = await res.json();

      // Instant results (Unipile / local DB)
      if (result.data && !result.pending) {
        setSearchResults(result.data || []);
        if (result.error) toast.info(result.error);
        if (!result.data?.length) toast.info("Aucun résultat trouvé");
        setSearching(false);
        return;
      }

      // Async search started — poll for results
      if (result.pending && result.runId) {
        toast.info("Recherche Instagram en cours, résultats dans quelques instants...");
        const datasetId = result.datasetId || "";
        let attempts = 0;
        const maxAttempts = 24;

        const poll = async () => {
          while (attempts < maxAttempts) {
            attempts++;
            await new Promise((r) => setTimeout(r, 5000));
            try {
              const statusRes = await fetch(
                `/api/instagram-search/status?runId=${result.runId}&datasetId=${datasetId}`,
              );
              const statusData = await statusRes.json();
              if (statusData.pending) continue;
              if (statusData.data && statusData.data.length > 0) {
                setSearchResults(statusData.data);
                toast.success(`${statusData.data.length} profil(s) trouvé(s)`);
              } else {
                toast.info(statusData.error || "Aucun résultat trouvé");
              }
              setSearching(false);
              return;
            } catch {
              continue;
            }
          }
          toast.error("La recherche a pris trop de temps. Réessayez.");
          setSearching(false);
        };

        poll();
        return;
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.info("Aucun résultat trouvé");
      }
      setSearching(false);
    } catch {
      toast.error("Erreur lors de la recherche");
      setSearching(false);
    }
  }

  async function handleSaveInstagramProspect(result: { id: string; name: string; username: string | null; source: string; profile_url?: string | null }) {
    setSavingId(result.id);
    try {
      const profileUrl = result.profile_url || (result.username
        ? `https://instagram.com/${result.username}`
        : undefined);
      await createProspect({
        name: result.name,
        profile_url: profileUrl,
        platform: "instagram",
      });
      setSavedIds((prev) => new Set(prev).add(result.id));
      toast.success(`${result.name} ajouté aux prospects`);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingId(null);
    }
  }

  async function handleGenerateStoryReaction() {
    if (!storyUrl.trim()) {
      toast.error("Collez une URL ou description de story Instagram");
      return;
    }
    setGeneratingReaction(true);
    setStoryReaction("");
    try {
      const context = `Réagir à cette story Instagram: ${storyUrl}. Générer un message de réaction naturel et engageant pour ouvrir la conversation.`;
      const msg = await generateAiMessage("ce prospect", context, "instagram");
      setStoryReaction(msg);
      toast.success("Message de réaction généré");
    } catch {
      toast.error("Erreur de génération");
    } finally {
      setGeneratingReaction(false);
    }
  }

  // Mode Duo IA+Humain — per-conversation auto mode
  const [autoModeIds, setAutoModeIds] = useState<Set<string>>(new Set());

  function toggleAutoMode(prospectId: string) {
    setAutoModeIds((prev) => {
      const next = new Set(prev);
      if (next.has(prospectId)) {
        next.delete(prospectId);
        toast.info("Mode manuel activé");
      } else {
        next.add(prospectId);
        toast.success("Mode IA Auto activé");
      }
      return next;
    });
  }

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
    <div className="space-y-6">

      <Tabs defaultValue="recherche">
        <TabsList>
          <TabsTrigger value="recherche">
            <Search className="h-4 w-4 mr-2" />
            Recherche
          </TabsTrigger>
          <TabsTrigger value="prospects">
            <Users className="h-4 w-4 mr-2" />
            Prospects ({prospects.length})
          </TabsTrigger>
          <TabsTrigger value="outils">
            <Wrench className="h-4 w-4 mr-2" />
            Outils
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="recherche">
          <div className="space-y-4">
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Rechercher par nom ou @username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchInstagram()}
                    className="h-11 rounded-xl flex-1"
                  />
                  <Button
                    onClick={handleSearchInstagram}
                    disabled={searching}
                    className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Rechercher
                  </Button>
                </div>
              </CardContent>
            </Card>

            {searching && (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Recherche sur Instagram en cours...
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <Card className="shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {searchResults.length} résultat{searchResults.length > 1 ? "s" : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {searchResults.map((result) => {
                      const isSaved = savedIds.has(result.id);
                      const isSaving = savingId === result.id;
                      return (
                        <div
                          key={result.id}
                          className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-foreground font-bold shrink-0">
                              {result.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{result.name}</p>
                                {result.username && (
                                  <a
                                    href={`https://instagram.com/${result.username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground shrink-0"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {result.username ? `@${result.username}` : ""}
                                {result.username && result.followers_count ? " · " : ""}
                                {result.followers_count ? `${result.followers_count.toLocaleString("fr-FR")} abonnés` : ""}
                              </p>
                              {result.biography && (
                                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                  {result.biography}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 ml-3">
                            {isSaved ? (
                              <Badge className="bg-brand/10 text-brand border border-brand/20 gap-1">
                                <Check className="h-3 w-3" />
                                Ajouté
                              </Badge>
                            ) : result.source === "local_database" ? (
                              <Badge variant="outline" className="text-xs">
                                Déjà prospect
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleSaveInstagramProspect(result)}
                                disabled={isSaving}
                                className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                              >
                                {isSaving ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Ajouter
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {!searching && searchResults.length === 0 && searchQuery && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun résultat pour &quot;{searchQuery}&quot;</p>
              </div>
            )}

            {!searching && !searchQuery && (
              <div className="text-center py-12 text-muted-foreground">
                <Instagram className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Entrez un @username ou un nom pour rechercher sur Instagram</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Les résultats proviennent de votre compte Instagram connecté</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="outils">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Story Scraper */}
            <Card className="shadow-sm rounded-2xl">
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
                  className="h-11 rounded-xl"
                />
                <Button
                  onClick={handleScrapeStories}
                  disabled={scrapingStories}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
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
                          className="border rounded-xl p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {story.type === "video" ? (
                                <Video className="h-4 w-4 text-foreground" />
                              ) : (
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
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
                                className="text-xs bg-muted/60 text-muted-foreground border-border/50"
                              >
                                <BarChart3 className="h-3 w-3 mr-1" />
                                Sondage : {story.pollQuestion}
                              </Badge>
                            )}
                            {story.hasQuestion && (
                              <Badge
                                variant="outline"
                                className="text-xs bg-foreground/10 text-foreground border-foreground/20"
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
            <Card className="shadow-sm rounded-2xl">
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
                    className="h-11 rounded-xl"
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
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleGenerateDm}
                  disabled={generatingDm}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                >
                  {generatingDm ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Générer le DM
                </Button>

                {generatedDm && (
                  <div className="border rounded-xl p-4">
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

            {/* Story Reaction Generator */}
            <Card className="lg:col-span-2 shadow-sm rounded-2xl border-brand/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Réagir à une Story
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Collez l&apos;URL d&apos;une story ou décrivez son contenu
                  pour générer un message de réaction personnalisé.
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="URL de la story ou description du contenu..."
                    value={storyUrl}
                    onChange={(e) => setStoryUrl(e.target.value)}
                    className="h-11 rounded-xl flex-1"
                  />
                  <Button
                    onClick={handleGenerateStoryReaction}
                    disabled={generatingReaction}
                    className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                  >
                    {generatingReaction ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Générer réaction
                  </Button>
                </div>

                {storyReaction && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Message de réaction (modifiable)
                    </label>
                    <Textarea
                      value={storyReaction}
                      onChange={(e) => setStoryReaction(e.target.value)}
                      className="min-h-[100px] rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => copyToClipboard(storyReaction)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copier
                      </Button>
                      <Button
                        size="sm"
                        className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl"
                        onClick={() => {
                          copyToClipboard(storyReaction);
                          toast.success(
                            "Réaction copiée ! Collez-la dans Instagram.",
                          );
                        }}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Envoyer (copier)
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prospects Tab */}
        <TabsContent value="prospects">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prospect Instagram..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-11 rounded-xl">
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

          <Card className="shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredProspects.map((prospect) => (
                  <div
                    key={prospect.id}
                    className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-foreground font-bold">
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
                              className="text-muted-foreground hover:text-foreground"
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
                      {/* Mode Duo IA+Humain toggle */}
                      <div className="flex items-center gap-1.5">
                        {autoModeIds.has(prospect.id) && (
                          <Badge className="bg-foreground/10 text-foreground border border-foreground/20 text-[10px] gap-1">
                            <Bot className="h-3 w-3" />
                            IA Auto
                          </Badge>
                        )}
                        <Switch
                          checked={autoModeIds.has(prospect.id)}
                          onCheckedChange={() => toggleAutoMode(prospect.id)}
                          aria-label="Mode IA Auto"
                        />
                      </div>
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
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Instagram className="h-7 w-7 opacity-50" />
                    </div>
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
