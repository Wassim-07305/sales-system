"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  Linkedin,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  Users,
  Wrench,
  Newspaper,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Bot,
  Unplug,
  AlertTriangle,
  Send,
  Wand2,
  UserPlus,
  Check,
} from "lucide-react";
import {
  analyzeProfile,
  suggestComments,
  generateAiMessage,
} from "@/lib/actions/hub-setting";
import { searchLinkedInProfiles } from "@/lib/actions/linkedin-api";
import { createProspect } from "@/lib/actions/prospects";
import type { LinkedInFeed, FeedPost, Recommendation, CommentHistory } from "@/lib/actions/linkedin-engage";
import {
  generateUnipileAuthLink,
  getUnipileStatus,
} from "@/lib/actions/unipile";
import { updateProspectStatus } from "@/lib/actions/prospecting";
import { FeedsView } from "@/app/(app)/prospecting/linkhub/feeds/feeds-view";
import { InteractionsView } from "@/app/(app)/prospecting/linkhub/interactions/interactions-view";
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

interface Props {
  prospects: Prospect[];
  unipileLinkedin?: { connected: boolean; accountName?: string } | null;
  initialFeeds?: LinkedInFeed[];
  initialPosts?: FeedPost[];
  recommendations?: Recommendation[];
  interactionComments?: CommentHistory[];
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

export function LinkedinView({ prospects, unipileLinkedin, initialFeeds, initialPosts, recommendations, interactionComments }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Unipile state
  const [connectingUnipile, setConnectingUnipile] = useState(false);
  const [liConnected, setLiConnected] = useState(
    unipileLinkedin?.connected ?? false,
  );
  const [liName, setLiName] = useState(unipileLinkedin?.accountName ?? "");
  const [refreshingUnipile, setRefreshingUnipile] = useState(false);

  async function handleConnectUnipile() {
    setConnectingUnipile(true);
    try {
      const result = await generateUnipileAuthLink("LINKEDIN");
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        window.open(
          result.url,
          "_blank",
          "width=600,height=700,scrollbars=yes",
        );
        toast.info("Connectez votre compte LinkedIn, puis cliquez Rafraîchir");
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
      const liAccount = result.accounts.find(
        (a) => a.provider.toUpperCase() === "LINKEDIN",
      );
      setLiConnected(!!liAccount);
      setLiName(liAccount?.name ?? "");
      toast.success(
        liAccount
          ? "LinkedIn connecté via Unipile"
          : "Aucun compte LinkedIn détecté",
      );
    } catch {
      toast.error("Erreur lors du rafraîchissement");
    }
    setRefreshingUnipile(false);
  }

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Comment suggester
  const [commentUrl, setCommentUrl] = useState("");
  const [comments, setComments] = useState<{ type: string; comment: string }[]>(
    [],
  );
  const [suggestingComments, setSuggestingComments] = useState(false);

  // DM generator
  const [dmName, setDmName] = useState("");
  const [dmContext, setDmContext] = useState("");
  const [generatedDm, setGeneratedDm] = useState("");
  const [generatingDm, setGeneratingDm] = useState(false);

  // Analyse + message combo
  const [comboUrl, setComboUrl] = useState("");
  const [comboAnalyzing, setComboAnalyzing] = useState(false);
  const [comboMessage, setComboMessage] = useState("");
  const [comboProfile, setComboProfile] = useState<Record<
    string,
    unknown
  > | null>(null);

  // LinkedIn search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchJobTitle, setSearchJobTitle] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; headline: string | null; source: string; profile_url?: string | null }>
  >([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleSearchLinkedIn() {
    const hasQuery = searchQuery.trim() || searchJobTitle.trim() || searchLocation.trim();
    if (!hasQuery) {
      toast.error("Entrez au moins un critère de recherche");
      return;
    }
    setSearching(true);
    setSearchResults([]);
    try {
      const filters = {
        location: searchLocation.trim() || undefined,
        jobTitle: searchJobTitle.trim() || undefined,
      };
      const result = await searchLinkedInProfiles(searchQuery, filters);
      if (result.error && !result.data) {
        toast.error(result.error);
      } else {
        setSearchResults(result.data || []);
        if (result.error) toast.info(result.error);
        if (!result.data?.length) toast.info("Aucun résultat trouvé");
      }
    } catch {
      toast.error("Erreur lors de la recherche");
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveProspect(result: { id: string; name: string; headline: string | null; source: string; profile_url?: string | null }) {
    setSavingId(result.id);
    try {
      const profileUrl = result.profile_url || (result.source !== "local_database"
        ? `https://linkedin.com/in/${result.id}`
        : undefined);
      await createProspect({
        name: result.name,
        profile_url: profileUrl,
        platform: "linkedin",
        notes: result.headline || undefined,
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

  async function handleAnalyzeAndGenerate() {
    if (!comboUrl.trim()) {
      toast.error("Entrez une URL de profil LinkedIn");
      return;
    }
    setComboAnalyzing(true);
    setComboMessage("");
    setComboProfile(null);
    try {
      const result = await analyzeProfile(comboUrl);
      const profileData = result as unknown as Record<string, unknown>;
      setComboProfile(profileData);
      // Generate message based on analysis
      const name = (profileData.name as string) || "ce prospect";
      const headline = (profileData.headline as string) || "";
      const context = headline
        ? `Profil LinkedIn: ${name}, ${headline}`
        : `Profil LinkedIn: ${name}`;
      const msg = await generateAiMessage(name, context, "linkedin");
      setComboMessage(msg);
      toast.success("Profil analysé et message généré");
    } catch {
      toast.error("Erreur lors de l'analyse");
    } finally {
      setComboAnalyzing(false);
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

  async function handleSuggestComments() {
    if (!commentUrl.trim()) {
      toast.error("Entrez une URL de post LinkedIn");
      return;
    }
    setSuggestingComments(true);
    try {
      const result = await suggestComments(commentUrl);
      setComments(result);
      toast.success("Commentaires générés");
    } catch {
      toast.error("Erreur de génération");
    } finally {
      setSuggestingComments(false);
    }
  }

  async function handleGenerateDm() {
    if (!dmName.trim() || !dmContext.trim()) {
      toast.error("Remplissez tous les champs");
      return;
    }
    setGeneratingDm(true);
    try {
      const msg = await generateAiMessage(dmName, dmContext, "linkedin");
      setGeneratedDm(msg);
      toast.success("Message LinkedIn généré");
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
          {initialFeeds && (
            <TabsTrigger value="feeds">
              <Newspaper className="h-4 w-4 mr-2" />
              Feeds
            </TabsTrigger>
          )}
          {recommendations && (
            <TabsTrigger value="interactions">
              <MessageSquare className="h-4 w-4 mr-2" />
              Interactions
            </TabsTrigger>
          )}
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="recherche">
          <div className="space-y-4">
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="pt-6 space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="Nom ou mot-clé..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchLinkedIn()}
                    className="h-11 rounded-xl flex-1"
                  />
                  <Button
                    onClick={handleSearchLinkedIn}
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
                <div className="flex gap-3">
                  <Input
                    placeholder="Poste / titre (ex: CEO, Ingénieur...)"
                    value={searchJobTitle}
                    onChange={(e) => setSearchJobTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchLinkedIn()}
                    className="h-10 rounded-xl flex-1 text-sm"
                  />
                  <Input
                    placeholder="Localisation (ex: Paris, France...)"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchLinkedIn()}
                    className="h-10 rounded-xl flex-1 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {searching && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <div className="flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Recherche sur LinkedIn en cours...
                </div>
                <p className="text-xs mt-2 text-muted-foreground/60">Cela peut prendre jusqu&apos;à 2 minutes</p>
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
                            <div className="h-10 w-10 rounded-xl bg-foreground/10 ring-1 ring-foreground/20 flex items-center justify-center text-foreground font-bold shrink-0">
                              {result.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">{result.name}</p>
                                {result.source !== "local_database" && (
                                  <a
                                    href={result.profile_url || `https://linkedin.com/in/${result.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground shrink-0"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                              {result.headline && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.headline}
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
                                onClick={() => handleSaveProspect(result)}
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
                <p className="text-sm">Recherchez des profils LinkedIn par nom, poste ou entreprise</p>
              </div>
            )}

            {!searching && !searchQuery && !searchJobTitle && !searchLocation && (
              <div className="text-center py-12 text-muted-foreground">
                <Linkedin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Recherchez des profils LinkedIn par nom, poste ou localisation</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Recherche via Unipile, LinkedIn API ou Apify</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="outils">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analyse + Message Combo */}
            <Card className="shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Analyseur de profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="https://linkedin.com/in/nom-du-profil"
                    value={comboUrl}
                    onChange={(e) => setComboUrl(e.target.value)}
                    className="h-11 rounded-xl flex-1"
                  />
                  <Button
                    onClick={handleAnalyzeAndGenerate}
                    disabled={comboAnalyzing}
                    className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                  >
                    {comboAnalyzing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4 mr-2" />
                    )}
                    Analyser
                  </Button>
                </div>

                {comboProfile && (
                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium">
                        {comboProfile.name as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Titre</span>
                      <span className="text-right max-w-[60%] text-xs">
                        {comboProfile.headline as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Abonnés</span>
                      <span>
                        {(comboProfile.followers as number)?.toLocaleString(
                          "fr-FR",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <Badge
                        className={
                          (comboProfile.score as number) >= 70
                            ? "bg-brand/10 text-brand border border-brand/20"
                            : "bg-muted/60 text-muted-foreground border border-border/50"
                        }
                      >
                        {comboProfile.score as number}/100
                      </Badge>
                    </div>
                  </div>
                )}

                {comboMessage && (
                  <div className="space-y-3 border-t pt-3">
                    <label className="text-sm font-medium">
                      Message généré
                    </label>
                    <Textarea
                      value={comboMessage}
                      onChange={(e) => setComboMessage(e.target.value)}
                      className="min-h-[100px] rounded-xl"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => copyToClipboard(comboMessage)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copier
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comment Suggester */}
            <Card className="shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Suggéreur de commentaires
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://linkedin.com/feed/update/..."
                  value={commentUrl}
                  onChange={(e) => setCommentUrl(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <Button
                  onClick={handleSuggestComments}
                  disabled={suggestingComments}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                >
                  {suggestingComments ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="h-4 w-4 mr-2" />
                  )}
                  Générer des commentaires
                </Button>

                {comments.length > 0 && (
                  <ScrollArea className="max-h-60">
                    <div className="space-y-3">
                      {comments.map((c, i) => (
                        <div key={i} className="border rounded-xl p-3">
                          <Badge variant="outline" className="text-xs mb-2">
                            {c.type === "value"
                              ? "Valeur ajoutée"
                              : c.type === "question"
                                ? "Question"
                                : "Témoignage"}
                          </Badge>
                          <p className="text-sm mb-2">{c.comment}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(c.comment)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copier
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* DM Generator */}
            <Card className="shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Générateur de DM
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Nom du prospect
                  </label>
                  <Input
                    placeholder="Jean Dupont"
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
                    placeholder="Ex: votre post sur le leadership m'a marqué"
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
                  <div className="space-y-3 border-t pt-3">
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {generatedDm}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => copyToClipboard(generatedDm)}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copier
                    </Button>
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
                placeholder="Rechercher un prospect LinkedIn..."
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
                      <div className="h-10 w-10 rounded-xl bg-foreground/10 ring-1 ring-foreground/20 flex items-center justify-center text-foreground font-bold">
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
                      <Linkedin className="h-7 w-7 opacity-50" />
                    </div>
                    Aucun prospect LinkedIn trouvé
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feeds Tab */}
        {initialFeeds && initialPosts && (
          <TabsContent value="feeds">
            <FeedsView initialFeeds={initialFeeds} initialPosts={initialPosts} />
          </TabsContent>
        )}

        {/* Interactions Tab */}
        {recommendations && interactionComments && (
          <TabsContent value="interactions">
            <InteractionsView recommendations={recommendations} comments={interactionComments} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
