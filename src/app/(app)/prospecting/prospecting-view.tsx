"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, Send, MessageCircle, Target, Linkedin, Instagram,
  RefreshCw, Loader2, SlidersHorizontal, ChevronDown, ChevronUp,
  X, Flame, Thermometer, Snowflake, Users, TrendingUp, ExternalLink, Eye,
  Bot, Clock3, CheckCircle2, XCircle, RotateCcw,
} from "lucide-react";
import { addProspect, updateProspectStatus, incrementDmsSent } from "@/lib/actions/prospecting";
import { recalculateAllScores } from "@/lib/actions/hub-setting";
import { sendAIMessage, createRelanceWorkflow, cancelRelance } from "@/lib/actions/automation";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface ComputedScore {
  total_score: number;
  temperature: string;
}

interface Prospect {
  id: string;
  name: string;
  platform: string | null;
  status: string;
  profile_url: string | null;
  last_message_at: string | null;
  created_at: string;
  computed_score: ComputedScore | null;
  relance_status?: string | null;
}

interface Quota {
  id: string;
  dms_sent: number;
  dms_target: number;
  replies_received: number;
  bookings_from_dms: number;
}

interface SegmentStats {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  avgScore: number;
}

const statusColors: Record<string, string> = {
  new: "bg-muted/50 text-muted-foreground border-border/50",
  contacted: "bg-foreground/10 text-foreground border-foreground/20",
  replied: "bg-brand/10 text-brand border-brand/20",
  booked: "bg-brand/15 text-brand border-brand/25",
  qualified: "bg-foreground/10 text-foreground border-foreground/20",
  converted: "bg-brand/10 text-brand border-brand/20",
  lost: "bg-muted/40 text-muted-foreground/60 border-border/30",
  not_interested: "bg-muted/40 text-muted-foreground/60 border-border/30",
};

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  replied: "Répondu",
  booked: "Booké",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
  not_interested: "Pas intéressé",
};

const temperatureConfig: Record<string, { label: string; color: string; icon: typeof Flame }> = {
  hot: { label: "Chaud", color: "bg-foreground/10 text-foreground border-foreground/20", icon: Flame },
  warm: { label: "Tiède", color: "bg-muted/60 text-muted-foreground border-border/50", icon: Thermometer },
  cold: { label: "Froid", color: "bg-muted/40 text-muted-foreground/60 border-border/30", icon: Snowflake },
};

export function ProspectingView({
  prospects,
  quota,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lists,
  segmentStats,
}: {
  prospects: Prospect[];
  quota: Quota | null;
  lists: { id: string; name: string }[];
  segmentStats: SegmentStats;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTemperature, setFilterTemperature] = useState<string>("all");
  const [filterRecency, setFilterRecency] = useState<string>("all");
  const [scoreMin, setScoreMin] = useState<string>("");
  const [scoreMax, setScoreMax] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPlatform, setNewPlatform] = useState("linkedin");
  const [newUrl, setNewUrl] = useState("");
  const [isRecalculating, startRecalcTransition] = useTransition();

  function getScoreBadgeStyle(score: number) {
    if (score >= 75) return "bg-brand/10 text-brand border-brand/20";
    if (score >= 45) return "bg-foreground/10 text-foreground border-foreground/20";
    return "bg-muted/40 text-muted-foreground/60 border-border/30";
  }

  async function handleRecalculateAll() {
    startRecalcTransition(async () => {
      try {
        const count = await recalculateAllScores();
        toast.success(`${count} score(s) recalculé(s)`);
        router.refresh();
      } catch {
        toast.error("Erreur lors du recalcul des scores");
      }
    });
  }

  const dmsSent = quota?.dms_sent || 0;
  const dmsTarget = quota?.dms_target || 20;
  const replies = quota?.replies_received || 0;
  const bookings = quota?.bookings_from_dms || 0;

  // Client-side filtering
  const filtered = prospects.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;

    // Temperature filter
    if (filterTemperature !== "all") {
      if (!p.computed_score) return false;
      if (p.computed_score.temperature !== filterTemperature) return false;
    }

    // Score range filter
    const minScore = scoreMin !== "" ? Number(scoreMin) : null;
    const maxScore = scoreMax !== "" ? Number(scoreMax) : null;
    if (minScore !== null || maxScore !== null) {
      if (!p.computed_score) return false;
      if (minScore !== null && p.computed_score.total_score < minScore) return false;
      if (maxScore !== null && p.computed_score.total_score > maxScore) return false;
    }

    // Recency filter
    if (filterRecency === "recent") {
      if (!p.last_message_at) return false;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (new Date(p.last_message_at) < sevenDaysAgo) return false;
    } else if (filterRecency === "inactive") {
      if (p.last_message_at) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (new Date(p.last_message_at) >= thirtyDaysAgo) return false;
      }
      // null last_message_at counts as inactive
    }

    return true;
  });

  const hasActiveSegmentFilters =
    filterTemperature !== "all" ||
    filterRecency !== "all" ||
    scoreMin !== "" ||
    scoreMax !== "";

  const activeFilterCount = [
    filterTemperature !== "all",
    filterRecency !== "all",
    scoreMin !== "" || scoreMax !== "",
  ].filter(Boolean).length;

  function resetSegmentFilters() {
    setFilterTemperature("all");
    setFilterRecency("all");
    setScoreMin("");
    setScoreMax("");
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    try {
      await addProspect({ name: newName, platform: newPlatform, profile_url: newUrl || undefined });
      toast.success("Prospect ajouté");
      setDialogOpen(false);
      setNewName("");
      setNewUrl("");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await updateProspectStatus(id, status);
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleDmIncrement() {
    await incrementDmsSent();
    toast.success("+1 DM envoye !");
    router.refresh();
  }

  async function handleAISend(prospectId: string, platform: string) {
    try {
      const result = await sendAIMessage(prospectId, platform);
      if (result.error === "MODE_VALIDATION_REQUISE") {
        toast.info("Message IA genere — Validation requise avant envoi", {
          description: result.message?.slice(0, 100) + "...",
          duration: 6000,
        });
      } else if (result.error === "MODE_HUMAIN") {
        toast.info("Suggestion IA generee (mode humain)", {
          description: result.message?.slice(0, 100) + "...",
          duration: 6000,
        });
      } else if (result.success) {
        toast.success("Message IA envoye avec succes");
        router.refresh();
      } else {
        toast.error(result.error || "Erreur d'envoi IA");
      }
    } catch {
      toast.error("Erreur lors de l'envoi IA");
    }
  }

  async function handleCreateRelance(prospectId: string, platform: string) {
    try {
      await createRelanceWorkflow({
        prospect_id: prospectId,
        platform: platform || "instagram",
        message_j2: "Bonjour, je me permets de vous relancer suite a mon message precedent. Avez-vous eu le temps d'y jeter un oeil ?",
        message_j3: "Bonjour, je comprends que vous etes sans doute tres occupe(e). Je reste disponible si vous souhaitez en discuter. Belle journee !",
      });
      toast.success("Relance automatique programmee (J+2 et J+3)");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la creation de la relance");
    }
  }

  async function handleCancelRelance(prospectId: string) {
    try {
      await cancelRelance(prospectId);
      toast.success("Relance annulee");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  }

  return (
    <div>
      <PageHeader title="Prospection" description="Tracker de prospection et quotas journaliers">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculateAll}
            disabled={isRecalculating}
          >
            {isRecalculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculer les scores
          </Button>
          <Link href="/prospecting/templates">
            <Button variant="outline" size="sm">Templates DM</Button>
          </Link>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-dark hover:bg-brand/90">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un prospect
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau prospect</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nom</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jean Dupont" />
                </div>
                <div>
                  <Label>Plateforme</Label>
                  <Select value={newPlatform} onValueChange={setNewPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL du profil (optionnel)</Label>
                  <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
                </div>
                <Button onClick={handleAdd} className="w-full bg-brand text-brand-dark hover:bg-brand/90">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {/* Segment summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-brand/30",
            filterTemperature === "all" && !hasActiveSegmentFilters && "ring-2 ring-brand/50"
          )}
          onClick={() => { setFilterTemperature("all"); setFiltersOpen(false); }}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{segmentStats.total}</p>
              <p className="text-xs text-muted-foreground mt-1">Total prospects</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-brand/30",
            filterTemperature === "hot" && "ring-2 ring-brand/50"
          )}
          onClick={() => setFilterTemperature(filterTemperature === "hot" ? "all" : "hot")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Flame className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{segmentStats.hot}</p>
              <p className="text-xs text-muted-foreground mt-1">Chauds</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-brand/30",
            filterTemperature === "warm" && "ring-2 ring-brand/50"
          )}
          onClick={() => setFilterTemperature(filterTemperature === "warm" ? "all" : "warm")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Thermometer className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{segmentStats.warm}</p>
              <p className="text-xs text-muted-foreground mt-1">Tièdes</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn(
            "cursor-pointer transition-all hover:ring-2 hover:ring-brand/30",
            filterTemperature === "cold" && "ring-2 ring-brand/50"
          )}
          onClick={() => setFilterTemperature(filterTemperature === "cold" ? "all" : "cold")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Snowflake className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{segmentStats.cold}</p>
              <p className="text-xs text-muted-foreground mt-1">Froids</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none">{segmentStats.avgScore}</p>
              <p className="text-xs text-muted-foreground mt-1">Score moyen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily quota */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold">Quota journalier</h3>
                <p className="text-sm text-muted-foreground">{dmsSent}/{dmsTarget} DMs envoyés aujourd&apos;hui</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{dmsTarget > 0 ? Math.round((dmsSent / dmsTarget) * 100) : 0}%</span>
              <Button size="sm" variant="outline" onClick={handleDmIncrement}>+1 DM</Button>
            </div>
          </div>
          <Progress value={dmsTarget > 0 ? (dmsSent / dmsTarget) * 100 : 0} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{dmsSent}</p>
            <p className="text-xs text-muted-foreground">DMs envoyés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{replies}</p>
            <p className="text-xs text-muted-foreground">Réponses reçues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">{bookings}</p>
            <p className="text-xs text-muted-foreground">RDV bookés</p>
          </CardContent>
        </Card>
      </div>

      {/* Basic filters row */}
      <div className="flex flex-wrap gap-3 mb-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un prospect..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Plateforme" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="linkedin">LinkedIn</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {Object.entries(statusLabels).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Collapsible segmentation filter panel */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Segmentation avancée
            {activeFilterCount > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-dark text-xs font-bold">
                {activeFilterCount}
              </span>
            )}
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {hasActiveSegmentFilters && (
            <Button variant="ghost" size="sm" onClick={resetSegmentFilters} className="gap-1 text-muted-foreground">
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {filtersOpen && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 rounded-xl border border-border/50 bg-muted/20">
            {/* Temperature */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Température
              </Label>
              <Select value={filterTemperature} onValueChange={setFilterTemperature}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {Object.entries(temperatureConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Score range */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Score (0-100)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={scoreMin}
                  onChange={(e) => setScoreMin(e.target.value)}
                  className="text-sm"
                  min={0}
                  max={100}
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={scoreMax}
                  onChange={(e) => setScoreMax(e.target.value)}
                  className="text-sm"
                  min={0}
                  max={100}
                />
              </div>
            </div>

            {/* Recency */}
            <div className="space-y-2">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Activité récente
              </Label>
              <Select value={filterRecency} onValueChange={setFilterRecency}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="recent">Actifs récemment (7 jours)</SelectItem>
                  <SelectItem value="inactive">Inactifs (30+ jours)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Active filter badges */}
      {(filterTemperature !== "all" || filterPlatform !== "all" || filterStatus !== "all" || filterRecency !== "all" || scoreMin || scoreMax) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {filterTemperature !== "all" && (
            <Badge
              variant="outline"
              className={cn("gap-1 cursor-pointer", temperatureConfig[filterTemperature]?.color)}
              onClick={() => setFilterTemperature("all")}
            >
              {temperatureConfig[filterTemperature]?.label}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filterPlatform !== "all" && (
            <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => setFilterPlatform("all")}>
              {filterPlatform === "linkedin" ? "LinkedIn" : "Instagram"}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filterStatus !== "all" && (
            <Badge variant="outline" className={cn("gap-1 cursor-pointer", statusColors[filterStatus])} onClick={() => setFilterStatus("all")}>
              {statusLabels[filterStatus] || filterStatus}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {filterRecency !== "all" && (
            <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => setFilterRecency("all")}>
              {filterRecency === "recent" ? "Actifs récemment" : "Inactifs"}
              <X className="h-3 w-3" />
            </Badge>
          )}
          {(scoreMin || scoreMax) && (
            <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => { setScoreMin(""); setScoreMax(""); }}>
              Score: {scoreMin || "0"} - {scoreMax || "100"}
              <X className="h-3 w-3" />
            </Badge>
          )}
          <span className="text-xs text-muted-foreground self-center ml-1">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Prospects table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Nom</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Température</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Score</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Plateforme</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Dernier msg</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Relance</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prospect) => {
                  const temp = prospect.computed_score?.temperature;
                  const tempConf = temp ? temperatureConfig[temp] : null;
                  const TempIcon = tempConf?.icon;

                  return (
                    <tr key={prospect.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-4 font-medium">
                        <Link href={`/prospecting/${prospect.id}`} className="hover:text-brand hover:underline">
                          {prospect.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        {tempConf && TempIcon ? (
                          <Badge variant="outline" className={cn("gap-1", tempConf.color)}>
                            <TempIcon className="h-3 w-3" />
                            {tempConf.label}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="p-4">
                        {prospect.computed_score ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  prospect.computed_score.total_score >= 75
                                    ? "bg-brand"
                                    : prospect.computed_score.total_score >= 45
                                    ? "bg-muted-foreground"
                                    : "bg-muted-foreground/40"
                                )}
                                style={{ width: `${prospect.computed_score.total_score}%` }}
                              />
                            </div>
                            <Badge className={cn("text-xs min-w-[3rem] justify-center", getScoreBadgeStyle(prospect.computed_score.total_score))}>
                              {prospect.computed_score.total_score}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="gap-1">
                          {prospect.platform === "linkedin" ? <Linkedin className="h-3 w-3" /> : <Instagram className="h-3 w-3" />}
                          {prospect.platform || "—"}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Select value={prospect.status} onValueChange={(v) => handleStatusChange(prospect.id, v)}>
                          <SelectTrigger className="w-[140px] h-8">
                            <Badge variant="outline" className={statusColors[prospect.status]}>
                              {statusLabels[prospect.status] || prospect.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {prospect.last_message_at
                          ? formatDistanceToNow(new Date(prospect.last_message_at), { addSuffix: true, locale: fr })
                          : "\u2014"}
                      </td>
                      <td className="p-4">
                        {prospect.relance_status === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                              <Clock3 className="h-3 w-3" />
                              En cours
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => handleCancelRelance(prospect.id)}
                              title="Annuler la relance"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {prospect.relance_status === "sent" && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Envoyee
                          </Badge>
                        )}
                        {prospect.relance_status === "responded" && (
                          <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 gap-1">
                            <MessageCircle className="h-3 w-3" />
                            Repondu
                          </Badge>
                        )}
                        {prospect.relance_status === "cancelled" && (
                          <Badge variant="outline" className="bg-muted/40 text-muted-foreground/60 border-border/30 gap-1">
                            <XCircle className="h-3 w-3" />
                            Annulee
                          </Badge>
                        )}
                        {!prospect.relance_status && (
                          <span className="text-xs text-muted-foreground">\u2014</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/prospecting/${prospect.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {prospect.platform && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAISend(prospect.id, prospect.platform || "instagram")}
                              title="Envoyer un message IA"
                              className="text-brand hover:text-brand/80"
                            >
                              <Bot className="h-4 w-4" />
                            </Button>
                          )}
                          {prospect.status === "contacted" && !prospect.relance_status && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateRelance(prospect.id, prospect.platform || "instagram")}
                              title="Programmer une relance automatique"
                              className="text-amber-600 hover:text-amber-700"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {prospect.profile_url && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={prospect.profile_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Target className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="font-medium text-sm">Aucun prospect</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                {hasActiveSegmentFilters || filterPlatform !== "all" || filterStatus !== "all" || search
                  ? "Aucun prospect ne correspond aux filtres sélectionnés."
                  : "Ajoutez votre premier prospect pour commencer."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
