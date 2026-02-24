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
import { toast } from "sonner";
import {
  Linkedin,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  Users,
  Wrench,
  ExternalLink,
  Copy,
} from "lucide-react";
import {
  analyzeProfile,
  suggestComments,
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

export function LinkedinView({ prospects }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search & filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Profile analyzer
  const [profileUrl, setProfileUrl] = useState("");
  const [profileResult, setProfileResult] = useState<Record<string, unknown> | null>(null);
  const [analyzingProfile, setAnalyzingProfile] = useState(false);

  // Comment suggester
  const [commentUrl, setCommentUrl] = useState("");
  const [comments, setComments] = useState<{ type: string; comment: string }[]>([]);
  const [suggestingComments, setSuggestingComments] = useState(false);

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
    <div>
      <PageHeader
        title="LinkedIn"
        description="Prospection et outils LinkedIn"
      >
        <Badge variant="outline" className="bg-blue-50 text-blue-700 gap-1">
          <Linkedin className="h-3 w-3" />
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
            {/* Profile Analyzer */}
            <Card>
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
                />
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzingProfile}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
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
                      <span className="font-medium">{profileResult.name as string}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Titre</span>
                      <span className="text-right max-w-[60%] text-xs">
                        {profileResult.headline as string}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Abonnés</span>
                      <span>{(profileResult.followers as number)?.toLocaleString("fr-FR")}</span>
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
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700"
                        }
                      >
                        {profileResult.score as number}/100
                      </Badge>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Recommandation</p>
                      <p className="text-xs">{profileResult.recommendation as string}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comment Suggester */}
            <Card>
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
                />
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
                  Générer des commentaires
                </Button>

                {comments.length > 0 && (
                  <ScrollArea className="max-h-60">
                    <div className="space-y-3">
                      {comments.map((c, i) => (
                        <div key={i} className="border rounded-lg p-3">
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
            <Card className="lg:col-span-2">
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
                    />
                  </div>
                </div>
                <Button
                  onClick={handleGenerateDm}
                  disabled={generatingDm}
                  className="bg-brand text-brand-dark hover:bg-brand/90"
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
          </div>
        </TabsContent>

        {/* Prospects Tab */}
        <TabsContent value="prospects">
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un prospect LinkedIn..."
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
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
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
                              className="text-muted-foreground hover:text-blue-600"
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
                    <Linkedin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Aucun prospect LinkedIn trouvé
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
