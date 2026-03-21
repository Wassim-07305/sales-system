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
} from "lucide-react";
import {
  analyzeProfile,
  suggestComments,
  generateAiMessage,
} from "@/lib/actions/hub-setting";
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

  // Profile analyzer
  const [profileUrl, setProfileUrl] = useState("");
  const [profileResult, setProfileResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);

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

  async function handleAnalyze() {
    if (!profileUrl.trim()) {
      toast.error("Entrez une URL de profil LinkedIn");
      return;
    }
    setAnalyzingProfile(true);
    try {
      const result = await analyzeProfile(profileUrl);
      setProfileResult(result as unknown as Record<string, unknown>);
      toast.success("Profil analysé");
    } catch {
      toast.error("Erreur d'analyse");
    } finally {
      setAnalyzingProfile(false);
    }
  }

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
      <Tabs defaultValue="outils">
        <TabsList>
          <TabsTrigger value="outils">
            <Wrench className="h-4 w-4 mr-2" />
            Outils
          </TabsTrigger>
          <TabsTrigger value="prospects">
            <Users className="h-4 w-4 mr-2" />
            Prospects ({prospects.length})
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

        {/* Tools Tab */}
        <TabsContent value="outils">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile Analyzer */}
            <Card className="shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Analyseur de profil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://linkedin.com/in/nom-du-profil"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzingProfile}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                >
                  {analyzingProfile ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Analyser le profil
                </Button>

                {profileResult && (
                  <div className="space-y-2 text-sm border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nom</span>
                      <span className="font-medium">
                        {profileResult.name as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Titre</span>
                      <span className="text-right max-w-[60%] text-xs">
                        {profileResult.headline as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Abonnés</span>
                      <span>
                        {(profileResult.followers as number)?.toLocaleString(
                          "fr-FR",
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Engagement</span>
                      <span>{profileResult.engagementRate as number}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Score</span>
                      <Badge
                        className={
                          (profileResult.score as number) >= 70
                            ? "bg-brand/10 text-brand border border-brand/20"
                            : "bg-muted/60 text-muted-foreground border border-border/50"
                        }
                      >
                        {profileResult.score as number}/100
                      </Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">
                        Recommandation
                      </p>
                      <p className="text-xs">
                        {profileResult.recommendation as string}
                      </p>
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
            <Card className="lg:col-span-2 shadow-sm rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Générateur de DM LinkedIn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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
                </div>
                <Button
                  onClick={handleGenerateDm}
                  disabled={generatingDm}
                  className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
                >
                  {generatingDm ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Générer le DM
                </Button>

                {generatedDm && (
                  <Card className="mt-4">
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Analyse + Message Combo */}
            <Card className="lg:col-span-2 shadow-sm rounded-2xl border-brand/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Analyser profil + Générer message
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
                    Analyser + Générer
                  </Button>
                </div>

                {comboProfile && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div className="border rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Nom</p>
                      <p className="font-medium">
                        {comboProfile.name as string}
                      </p>
                    </div>
                    <div className="border rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Titre</p>
                      <p className="text-xs">
                        {comboProfile.headline as string}
                      </p>
                    </div>
                    <div className="border rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Score</p>
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
                    <div className="border rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">Abonnés</p>
                      <p className="font-medium">
                        {(comboProfile.followers as number)?.toLocaleString(
                          "fr-FR",
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {comboMessage && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">
                      Message généré (modifiable)
                    </label>
                    <Textarea
                      value={comboMessage}
                      onChange={(e) => setComboMessage(e.target.value)}
                      className="min-h-[120px] rounded-xl"
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
                      <Button
                        size="sm"
                        className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl"
                        onClick={() => {
                          copyToClipboard(comboMessage);
                          toast.success(
                            "Message copié ! Collez-le dans LinkedIn.",
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
