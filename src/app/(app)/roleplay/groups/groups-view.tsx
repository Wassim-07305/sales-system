"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  Calendar,
  Trophy,
  Target,
  Brain,
  Plus,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  X,
} from "lucide-react";
import {
  createTrainingGroup,
  getGroupDetails,
  addGroupSession,
  getGroupLeaderboard,
} from "@/lib/actions/group-training";
import { toast } from "sonner";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string;
  niche: string;
  member_count: number;
  sessions_count: number;
  avg_score: number;
  created_at: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface GroupMember {
  user_id: string;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
  sessions_attended: number;
  avg_score: number;
  progress: number;
}

interface GroupSession {
  id: string;
  title: string;
  date: string;
  type: string;
  participants?: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  sessions: number;
  avg_score: number;
  progress: number;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string;
  niche: string;
  avg_score: number;
  members: GroupMember[];
  sessions: GroupSession[];
}

interface Props {
  groups: Group[];
  teamMembers: TeamMember[];
}

const nicheColors: Record<string, string> = {
  Closing: "bg-foreground/10 text-foreground border-border",
  Setting: "bg-muted/40 text-muted-foreground/60 border-border",
  Prospection: "bg-muted/60 text-muted-foreground border-border",
  Négociation: "bg-foreground/10 text-foreground border-border",
  "Objection handling": "bg-muted/60 text-muted-foreground border-border",
};

const sessionTypeLabels: Record<string, { label: string; color: string }> = {
  roleplay: {
    label: "Role-Play",
    color: "bg-brand/10 text-brand border-brand/20",
  },
  workshop: {
    label: "Workshop",
    color: "bg-muted/40 text-muted-foreground/60 border-border",
  },
  debrief: {
    label: "Debrief",
    color: "bg-muted/60 text-muted-foreground border-border",
  },
};

const emptyGroupForm = {
  name: "",
  description: "",
  niche: "",
  memberIds: [] as string[],
};

const emptySessionForm = {
  title: "",
  date: "",
  type: "roleplay" as "roleplay" | "workshop" | "debrief",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-brand";
  if (score >= 60) return "text-muted-foreground";
  return "text-foreground";
}

export function GroupsView({ groups, teamMembers }: Props) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [saving, setSaving] = useState(false);

  // Group detail panel
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add session dialog
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState(emptySessionForm);
  const [savingSession, setSavingSession] = useState(false);

  // Stats
  const totalGroups = groups.length;
  const totalMembers = groups.reduce((s, g) => s + g.member_count, 0);
  const totalSessionsMonth = groups.reduce((s, g) => s + g.sessions_count, 0);
  const avgScore =
    groups.length > 0
      ? Math.round(groups.reduce((s, g) => s + g.avg_score, 0) / groups.length)
      : 0;

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupDetail(null);
      setLeaderboard([]);
      return;
    }
    setLoadingDetail(true);
    Promise.all([
      getGroupDetails(selectedGroupId),
      getGroupLeaderboard(selectedGroupId),
    ])
      .then(([detail, lb]) => {
        setGroupDetail(detail as GroupDetail | null);
        setLeaderboard(lb as LeaderboardEntry[]);
      })
      .finally(() => setLoadingDetail(false));
  }, [selectedGroupId]);

  function toggleMember(memberId: string) {
    setGroupForm((prev) => ({
      ...prev,
      memberIds: prev.memberIds.includes(memberId)
        ? prev.memberIds.filter((id) => id !== memberId)
        : [...prev.memberIds, memberId],
    }));
  }

  async function handleCreateGroup() {
    if (!groupForm.name.trim() || !groupForm.niche) {
      toast.error("Le nom et la niche sont requis");
      return;
    }
    setSaving(true);
    try {
      await createTrainingGroup({
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        niche: groupForm.niche,
        memberIds: groupForm.memberIds,
      });
      toast.success("Groupe créé avec succès");
      setCreateDialogOpen(false);
      setGroupForm(emptyGroupForm);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la création du groupe");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSession() {
    if (!sessionForm.title.trim() || !sessionForm.date || !selectedGroupId) {
      toast.error("Le titre et la date sont requis");
      return;
    }
    setSavingSession(true);
    try {
      await addGroupSession(selectedGroupId, {
        title: sessionForm.title.trim(),
        date: sessionForm.date,
        type: sessionForm.type,
      });
      toast.success("Session ajoutée");
      setSessionDialogOpen(false);
      setSessionForm(emptySessionForm);
      // Refresh detail
      const [detail, lb] = await Promise.all([
        getGroupDetails(selectedGroupId),
        getGroupLeaderboard(selectedGroupId),
      ]);
      setGroupDetail(detail as GroupDetail | null);
      setLeaderboard(lb as LeaderboardEntry[]);
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'ajout de la session");
    } finally {
      setSavingSession(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Groupes d'entraînement"
        description="Gérez vos groupes de formation et suivez la progression de chaque équipe"
      >
        <div className="flex gap-2">
          <Link href="/roleplay">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
          <Button
            onClick={() => {
              setGroupForm(emptyGroupForm);
              setCreateDialogOpen(true);
            }}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau groupe
          </Button>
        </div>
      </PageHeader>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand/10">
              <Users className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalGroups}</p>
              <p className="text-xs text-muted-foreground">Total groupes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/40">
              <UserPlus className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalMembers}</p>
              <p className="text-xs text-muted-foreground">Membres actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted/60">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSessionsMonth}</p>
              <p className="text-xs text-muted-foreground">Sessions ce mois</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-foreground/10">
              <Target className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}%</p>
              <p className="text-xs text-muted-foreground">Score moyen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups grid */}
        <div className={selectedGroupId ? "lg:col-span-1" : "lg:col-span-3"}>
          {groups.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucun groupe d&apos;entraînement</p>
                <p className="text-sm mt-1">
                  Créez votre premier groupe pour organiser les sessions de
                  formation.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className={`grid gap-4 ${selectedGroupId ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}
            >
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className={`cursor-pointer transition-all hover:border-brand/50 ${
                    selectedGroupId === group.id
                      ? "border-brand ring-1 ring-brand/30"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedGroupId(
                      selectedGroupId === group.id ? null : group.id,
                    )
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm leading-tight">
                        {group.name}
                      </h3>
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                          selectedGroupId === group.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {group.description}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${nicheColors[group.niche] || "bg-muted/40 text-muted-foreground"}`}
                      >
                        {group.niche}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-sm font-bold">
                          {group.member_count}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Membres
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-bold">
                          {group.sessions_count}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Sessions
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-sm font-bold ${getScoreColor(group.avg_score)}`}
                        >
                          {group.avg_score}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Score
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Group detail panel */}
        {selectedGroupId && (
          <div className="lg:col-span-2 space-y-4">
            {loadingDetail ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  Chargement...
                </CardContent>
              </Card>
            ) : groupDetail ? (
              <>
                {/* Group header */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-bold">
                            {groupDetail.name}
                          </h2>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${nicheColors[groupDetail.niche] || ""}`}
                          >
                            {groupDetail.niche}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {groupDetail.description}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedGroupId(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Target className="h-4 w-4 text-brand" />
                        <span
                          className={`font-semibold ${getScoreColor(groupDetail.avg_score)}`}
                        >
                          {groupDetail.avg_score}%
                        </span>
                        <span className="text-muted-foreground">
                          score moyen
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-brand">
                        <TrendingUp className="h-4 w-4" />
                        <span>+5% ce mois</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-brand" />
                      Classement du groupe
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Nom</TableHead>
                          <TableHead className="text-center">
                            Sessions
                          </TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-right">
                            Progression
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaderboard.map((entry) => (
                          <TableRow key={entry.rank}>
                            <TableCell className="font-bold">
                              {entry.rank <= 3 ? (
                                <span
                                  className={
                                    entry.rank === 1
                                      ? "text-brand"
                                      : entry.rank === 2
                                        ? "text-muted-foreground"
                                        : "text-muted-foreground/60"
                                  }
                                >
                                  {entry.rank === 1
                                    ? "🥇"
                                    : entry.rank === 2
                                      ? "🥈"
                                      : "🥉"}
                                </span>
                              ) : (
                                entry.rank
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                                  {getInitials(entry.name)}
                                </div>
                                <span className="font-medium text-sm">
                                  {entry.name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {entry.sessions}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`text-sm font-semibold ${getScoreColor(entry.avg_score)}`}
                              >
                                {entry.avg_score}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`text-sm ${entry.progress >= 0 ? "text-brand" : "text-foreground"}`}
                              >
                                {entry.progress >= 0 ? "+" : ""}
                                {entry.progress}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Members list */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground/60" />
                      Membres ({groupDetail.members.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membre</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead className="text-center">
                            Sessions
                          </TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-right">
                            Progression
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupDetail.members.map((member) => (
                          <TableRow key={member.user_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-bold">
                                  {getInitials(
                                    member.profile?.full_name || "?",
                                  )}
                                </div>
                                <span className="font-medium text-sm">
                                  {member.profile?.full_name || "Membre"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {member.profile?.role || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {member.sessions_attended}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`text-sm font-semibold ${getScoreColor(member.avg_score)}`}
                              >
                                {member.avg_score}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`text-sm ${member.progress >= 0 ? "text-brand" : "text-foreground"}`}
                              >
                                {member.progress >= 0 ? "+" : ""}
                                {member.progress}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Sessions list */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Sessions ({groupDetail.sessions.length})
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSessionForm(emptySessionForm);
                          setSessionDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table className="min-w-[600px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titre</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">
                            Participants
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {groupDetail.sessions.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              className="text-center text-muted-foreground py-6"
                            >
                              Aucune session pour ce groupe
                            </TableCell>
                          </TableRow>
                        ) : (
                          groupDetail.sessions.map((session) => {
                            const typeInfo = sessionTypeLabels[
                              session.type
                            ] || {
                              label: session.type,
                              color: "",
                            };
                            return (
                              <TableRow key={session.id}>
                                <TableCell className="font-medium text-sm">
                                  {session.title}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(session.date)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${typeInfo.color}`}
                                  >
                                    {typeInfo.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-sm">
                                  {session.participants || "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Create group dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau groupe d&apos;entraînement</DialogTitle>
            <DialogDescription>
              Créez un groupe et assignez-y des membres de votre équipe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du groupe</Label>
              <Input
                value={groupForm.name}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, name: e.target.value })
                }
                placeholder="Ex: Closers débutants"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={groupForm.description}
                onChange={(e) =>
                  setGroupForm({ ...groupForm, description: e.target.value })
                }
                rows={3}
                placeholder="Décrivez les objectifs du groupe..."
              />
            </div>
            <div>
              <Label>Niche</Label>
              <Select
                value={groupForm.niche}
                onValueChange={(v) => setGroupForm({ ...groupForm, niche: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Closing">Closing</SelectItem>
                  <SelectItem value="Setting">Setting</SelectItem>
                  <SelectItem value="Prospection">Prospection</SelectItem>
                  <SelectItem value="Négociation">Négociation</SelectItem>
                  <SelectItem value="Objection handling">
                    Objection handling
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Membres</Label>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun membre disponible
                </p>
              ) : (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {teamMembers.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={groupForm.memberIds.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-6 h-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[9px] font-bold">
                          {getInitials(member.full_name || "?")}
                        </div>
                        <span className="text-sm font-medium">
                          {member.full_name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                      >
                        {member.role}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
              {groupForm.memberIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {groupForm.memberIds.length} membre
                  {groupForm.memberIds.length > 1 ? "s" : ""} sélectionné
                  {groupForm.memberIds.length > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Button
              onClick={handleCreateGroup}
              disabled={saving}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {saving ? "Création..." : "Créer le groupe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add session dialog */}
      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une session</DialogTitle>
            <DialogDescription>
              Planifiez une nouvelle session pour ce groupe.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titre de la session</Label>
              <Input
                value={sessionForm.title}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, title: e.target.value })
                }
                placeholder="Ex: Gestion des objections prix"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="datetime-local"
                value={sessionForm.date}
                onChange={(e) =>
                  setSessionForm({ ...sessionForm, date: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Type de session</Label>
              <Select
                value={sessionForm.type}
                onValueChange={(v) =>
                  setSessionForm({
                    ...sessionForm,
                    type: v as "roleplay" | "workshop" | "debrief",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roleplay">Role-Play</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="debrief">Debrief</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleAddSession}
              disabled={savingSession}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {savingSession ? "Ajout..." : "Ajouter la session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
