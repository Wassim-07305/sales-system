"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Linkedin,
  Instagram,
  Users,
  MessageCircle,
  Reply,
  CalendarCheck,
  TrendingUp,
  Search,
  Sparkles,
  MessageSquare,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  Send,
  ArrowDownRight,
} from "lucide-react";
import {
  analyzeProfile,
  generateAiMessage,
  suggestComments,
  recalculateAllScores,
} from "@/lib/actions/hub-setting";

interface PlatformOverview {
  platform: string;
  total: number;
  contacted: number;
  replied: number;
  booked: number;
  avgScore: number;
}

interface WhatsAppStats {
  conversations: number;
  messagesSent: number;
  messagesReceived: number;
  connected: boolean;
}

interface Props {
  overview: PlatformOverview[];
  whatsappStats?: WhatsAppStats | null;
}

export function HubView({ overview, whatsappStats }: Props) {
  const router = useRouter();
  // Analyze profile state
  const [profileUrl, setProfileUrl] = useState("");
  const [profileResult, setProfileResult] = useState<Record<string, unknown> | null>(null);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);

  // AI message state
  const [msgName, setMsgName] = useState("");
  const [msgContext, setMsgContext] = useState("");
  const [msgPlatform, setMsgPlatform] = useState("linkedin");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [generatingMsg, setGeneratingMsg] = useState(false);

  // Comment suggestions state
  const [commentUrl, setCommentUrl] = useState("");
  const [comments, setComments] = useState<{ type: string; comment: string }[]>([]);
  const [suggestingComments, setSuggestingComments] = useState(false);

  // Recalculate all scores state
  const [recalculating, setRecalculating] = useState(false);

  const platformIcons: Record<string, React.ReactNode> = {
    linkedin: <Linkedin className="h-5 w-5 text-blue-600" />,
    instagram: <Instagram className="h-5 w-5 text-pink-500" />,
    whatsapp: <Phone className="h-5 w-5 text-green-600" />,
  };

  const platformLabels: Record<string, string> = {
    linkedin: "LinkedIn",
    instagram: "Instagram",
    whatsapp: "WhatsApp",
  };

  const platformColors: Record<string, string> = {
    linkedin: "bg-blue-500/10 border-blue-500/20",
    instagram: "bg-pink-500/10 border-pink-500/20",
    whatsapp: "bg-green-500/10 border-green-500/20",
  };

  async function handleAnalyzeProfile() {
    if (!profileUrl.trim()) {
      toast.error("Veuillez entrer une URL de profil");
      return;
    }
    setAnalyzingProfile(true);
    try {
      const result = await analyzeProfile(profileUrl);
      setProfileResult(result as unknown as Record<string, unknown>);
      toast.success("Profil analysé avec succès");
    } catch {
      toast.error("Erreur lors de l'analyse du profil");
    } finally {
      setAnalyzingProfile(false);
    }
  }

  async function handleGenerateMessage() {
    if (!msgName.trim() || !msgContext.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setGeneratingMsg(true);
    try {
      const message = await generateAiMessage(msgName, msgContext, msgPlatform);
      setGeneratedMessage(message);
      toast.success("Message généré avec succès");
    } catch {
      toast.error("Erreur lors de la génération du message");
    } finally {
      setGeneratingMsg(false);
    }
  }

  async function handleSuggestComments() {
    if (!commentUrl.trim()) {
      toast.error("Veuillez entrer une URL de post");
      return;
    }
    setSuggestingComments(true);
    try {
      const result = await suggestComments(commentUrl);
      setComments(result);
      toast.success("Commentaires suggérés avec succès");
    } catch {
      toast.error("Erreur lors de la suggestion de commentaires");
    } finally {
      setSuggestingComments(false);
    }
  }

  async function handleRecalculateAll() {
    setRecalculating(true);
    try {
      const count = await recalculateAllScores();
      toast.success(`${count} score(s) recalcule(s)`);
      router.refresh();
    } catch {
      toast.error("Erreur lors du recalcul des scores");
    } finally {
      setRecalculating(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  }

  return (
    <div>
      <PageHeader
        title="Hub Multi-Réseaux"
        description="Vue d'ensemble de votre prospection sur tous les réseaux"
      />

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {overview.map((p) => (
          <Card key={p.platform} className={`border ${platformColors[p.platform] || ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                {platformIcons[p.platform]}
                {platformLabels[p.platform] || p.platform}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">{p.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MessageCircle className="h-4 w-4 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">{p.contacted}</p>
                  <p className="text-xs text-muted-foreground">Contactés</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Reply className="h-4 w-4 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold">{p.replied}</p>
                  <p className="text-xs text-muted-foreground">Répondu</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <CalendarCheck className="h-4 w-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold">{p.booked}</p>
                  <p className="text-xs text-muted-foreground">RDV</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold">{p.avgScore}</p>
                  <p className="text-xs text-muted-foreground">Score moy.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* WhatsApp Card */}
        <Card className={`border ${platformColors.whatsapp}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {platformIcons.whatsapp}
              WhatsApp
              {whatsappStats?.connected ? (
                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] ml-auto">
                  Connecté
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] ml-auto">
                  Non connecté
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold">{whatsappStats?.conversations ?? 0}</p>
                <p className="text-xs text-muted-foreground">Conversations</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Send className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{whatsappStats?.messagesSent ?? 0}</p>
                <p className="text-xs text-muted-foreground">Envoyés</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold">{whatsappStats?.messagesReceived ?? 0}</p>
                <p className="text-xs text-muted-foreground">Reçus</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Dialogs */}
      {/* Recalculate all scores */}
      <div className="mb-8">
        <Button
          onClick={handleRecalculateAll}
          disabled={recalculating}
          variant="outline"
          className="w-full sm:w-auto"
        >
          {recalculating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Recalculer les scores
        </Button>
      </div>

      {/* Campagnes Drip Link */}
      <div className="mb-8">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-brand/20"
          onClick={() => router.push("/prospecting/campaigns")}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
              <Mail className="h-6 w-6 text-brand" />
            </div>
            <div>
              <p className="font-semibold text-base">Campagnes</p>
              <p className="text-sm text-muted-foreground">
                Automatisez vos sequences de prospection multi-étapes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Analyze Profile Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                  <Search className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-medium">Analyser profil</p>
                  <p className="text-xs text-muted-foreground">
                    Analyse IA d&apos;un profil social
                  </p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Analyser un profil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  URL du profil
                </label>
                <Input
                  placeholder="https://linkedin.com/in/nom ou https://instagram.com/nom"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAnalyzeProfile}
                disabled={analyzingProfile}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              >
                {analyzingProfile ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Analyser
              </Button>

              {profileResult && (
                <ScrollArea className="max-h-64">
                  <Card>
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nom</span>
                        <span className="font-medium">
                          {profileResult.name as string}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Plateforme</span>
                        <Badge variant="outline">
                          {profileResult.platform as string}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Titre</span>
                        <span className="text-right max-w-[60%]">
                          {profileResult.headline as string}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Abonnés</span>
                        <span className="font-medium">
                          {(profileResult.followers as number)?.toLocaleString("fr-FR")}
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
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : (profileResult.score as number) >= 50
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }
                        >
                          {profileResult.score as number}/100
                        </Badge>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground mb-1">Sujets</p>
                        <div className="flex flex-wrap gap-1">
                          {(profileResult.topics as string[])?.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <p className="text-muted-foreground mb-1">
                          Recommandation
                        </p>
                        <p className="text-sm">
                          {profileResult.recommendation as string}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollArea>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate AI Message Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-medium">Générer message IA</p>
                  <p className="text-xs text-muted-foreground">
                    DM personnalisé par plateforme
                  </p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Générer un message IA</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Nom du prospect
                </label>
                <Input
                  placeholder="Jean Dupont"
                  value={msgName}
                  onChange={(e) => setMsgName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Plateforme
                </label>
                <Select value={msgPlatform} onValueChange={setMsgPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Contexte / Accroche
                </label>
                <Textarea
                  placeholder="Ex: vous avez partagé un post sur le growth hacking qui m'a interpellé"
                  value={msgContext}
                  onChange={(e) => setMsgContext(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleGenerateMessage}
                disabled={generatingMsg}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              >
                {generatingMsg ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Générer le message
              </Button>

              {generatedMessage && (
                <Card>
                  <CardContent className="p-4">
                    <pre className="whitespace-pre-wrap text-sm mb-3 font-sans">
                      {generatedMessage}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generatedMessage)}
                    >
                      Copier le message
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Suggest Comments Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="font-medium">Suggérer commentaires</p>
                  <p className="text-xs text-muted-foreground">
                    3 commentaires intelligents
                  </p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Suggérer des commentaires</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  URL du post
                </label>
                <Input
                  placeholder="https://linkedin.com/feed/update/..."
                  value={commentUrl}
                  onChange={(e) => setCommentUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSuggestComments}
                disabled={suggestingComments}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              >
                {suggestingComments ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="h-4 w-4 mr-2" />
                )}
                Générer les commentaires
              </Button>

              {comments.length > 0 && (
                <ScrollArea className="max-h-72">
                  <div className="space-y-3">
                    {comments.map((c, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {c.type === "value"
                                ? "Valeur ajoutée"
                                : c.type === "question"
                                ? "Question"
                                : "Témoignage"}
                            </Badge>
                          </div>
                          <p className="text-sm mb-3">{c.comment}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(c.comment)}
                          >
                            Copier
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
