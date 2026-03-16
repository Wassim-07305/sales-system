"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Trash2,
  ShieldBan,
  ShieldCheck,
  Flag,
  History,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import {
  hidePost,
  unhidePost,
  deleteCommunityPost,
  banCommunityUser,
  unbanCommunityUser,
  reviewReport,
} from "@/lib/actions/community";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

// ─── Types ───

interface Post {
  id: string;
  type: string;
  title: string | null;
  content: string;
  hidden: boolean;
  created_at: string;
  author: { id: string; full_name: string | null } | null;
}

interface Report {
  id: string;
  post_id: string;
  category: string;
  reason: string;
  status: "pending" | "reviewed" | "dismissed";
  created_at: string;
  reporter: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  post: {
    id: string;
    title: string | null;
    content: string;
    author_id: string | null;
  } | null;
}

interface Ban {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  } | null;
  moderator: { id: string; full_name: string | null } | null;
}

interface ModerationLog {
  id: string;
  post_id: string;
  action: "hide" | "unhide" | "delete";
  reason: string;
  category: string;
  created_at: string;
  moderator: { id: string; full_name: string | null } | null;
}

interface Member {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  is_banned: boolean;
}

const MODERATION_CATEGORIES = [
  { value: "spam", label: "Spam" },
  { value: "contenu_inapproprie", label: "Contenu inapproprié" },
  { value: "hors_sujet", label: "Hors sujet" },
  { value: "harcelement", label: "Harcèlement" },
  { value: "autre", label: "Autre" },
];

const categoryLabels: Record<string, string> = {
  spam: "Spam",
  contenu_inapproprie: "Contenu inapproprié",
  hors_sujet: "Hors sujet",
  harcelement: "Harcèlement",
  autre: "Autre",
};

const categoryColors: Record<string, string> = {
  spam: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  contenu_inapproprie: "bg-red-500/10 text-red-600 border-red-500/20",
  hors_sujet: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  harcelement: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  autre: "bg-muted/50 text-muted-foreground border-border",
};

const actionLabels: Record<string, string> = {
  hide: "Masqué",
  unhide: "Rétabli",
  delete: "Supprimé",
};

export function ManageView({
  posts,
  reports,
  bans,
  logs,
  members,
  pendingReportsCount,
}: {
  posts: Post[];
  reports: Report[];
  bans: Ban[];
  logs: ModerationLog[];
  members: Member[];
  pendingReportsCount: number;
}) {
  const router = useRouter();
  const [moderationDialog, setModerationDialog] = useState<{
    type: "hide" | "delete";
    postId: string;
  } | null>(null);
  const [modReason, setModReason] = useState("");
  const [modCategory, setModCategory] = useState("autre");
  const [banDialog, setBanDialog] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [memberSearch, setMemberSearch] = useState("");

  // ─── Moderation actions with reasons ───

  async function handleModerate() {
    if (!moderationDialog || !modReason.trim()) {
      toast.error("Veuillez saisir une raison");
      return;
    }
    if (moderationDialog.type === "hide") {
      await hidePost(moderationDialog.postId, modReason, modCategory);
      toast.success("Post masqué");
    } else {
      await deleteCommunityPost(
        moderationDialog.postId,
        modReason,
        modCategory,
      );
      toast.success("Post supprimé");
    }
    setModerationDialog(null);
    setModReason("");
    setModCategory("autre");
    router.refresh();
  }

  async function handleUnhide(id: string) {
    await unhidePost(id);
    toast.success("Post visible");
    router.refresh();
  }

  // ─── Ban actions ───

  async function handleBan() {
    if (!banDialog || !banReason.trim()) {
      toast.error("Veuillez saisir une raison");
      return;
    }
    const result = await banCommunityUser(banDialog, banReason);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Utilisateur banni de la communauté");
    }
    setBanDialog(null);
    setBanReason("");
    router.refresh();
  }

  async function handleUnban(userId: string) {
    const result = await unbanCommunityUser(userId);
    if ("error" in result && result.error) {
      toast.error(result.error);
    } else {
      toast.success("Bannissement levé");
    }
    router.refresh();
  }

  // ─── Report actions ───

  async function handleReviewReport(
    reportId: string,
    status: "reviewed" | "dismissed",
  ) {
    await reviewReport(reportId, status);
    toast.success(
      status === "reviewed" ? "Signalement traité" : "Signalement rejeté",
    );
    router.refresh();
  }

  // ─── Filter members ───

  const filteredMembers = members.filter((m) => {
    if (!memberSearch) return true;
    return m.full_name?.toLowerCase().includes(memberSearch.toLowerCase());
  });

  const pendingReports = reports.filter((r) => r.status === "pending");
  const processedReports = reports.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Modération"
        description={`${posts.length} posts · ${pendingReportsCount} signalement${pendingReportsCount !== 1 ? "s" : ""} en attente · ${bans.length} banni${bans.length !== 1 ? "s" : ""}`}
      >
        <Link href="/community">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <Tabs defaultValue="posts">
        <TabsList className="mb-6">
          <TabsTrigger value="posts">
            <Eye className="h-4 w-4 mr-1.5" />
            Posts ({posts.length})
          </TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            <Flag className="h-4 w-4 mr-1.5" />
            Signalements
            {pendingReportsCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5">
                {pendingReportsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-1.5" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-1.5" />
            Historique
          </TabsTrigger>
        </TabsList>

        {/* ─── Posts Tab ─── */}
        <TabsContent value="posts">
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className={post.hidden ? "opacity-50" : ""}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">
                        {post.author?.full_name || "Anonyme"}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {post.type}
                      </Badge>
                      {post.hidden && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20"
                        >
                          Masqué
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {post.hidden ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUnhide(post.id)}
                        title="Rendre visible"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setModerationDialog({ type: "hide", postId: post.id })
                        }
                        title="Masquer"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500"
                      onClick={() =>
                        setModerationDialog({ type: "delete", postId: post.id })
                      }
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {posts.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Eye className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucun post à modérer</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Reports Tab ─── */}
        <TabsContent value="reports">
          {pendingReports.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                En attente ({pendingReports.length})
              </h3>
              <div className="space-y-3">
                {pendingReports.map((report) => (
                  <Card key={report.id} className="border-amber-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${categoryColors[report.category] || categoryColors.autre}`}
                            >
                              {categoryLabels[report.category] ||
                                report.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Signalé par{" "}
                              <span className="font-medium text-foreground">
                                {report.reporter?.full_name || "Anonyme"}
                              </span>{" "}
                              {formatDistanceToNow(
                                new Date(report.created_at),
                                {
                                  addSuffix: true,
                                  locale: fr,
                                },
                              )}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{report.reason}</p>
                          {report.post && (
                            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Post concerné :
                              </span>{" "}
                              {report.post.title ||
                                report.post.content?.slice(0, 100)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() =>
                              handleReviewReport(report.id, "reviewed")
                            }
                            title="Marquer comme traité"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              handleReviewReport(report.id, "dismissed")
                            }
                            title="Rejeter"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          {report.post && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500"
                              onClick={() =>
                                setModerationDialog({
                                  type: "hide",
                                  postId: report.post!.id,
                                })
                              }
                              title="Masquer le post"
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {processedReports.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Traités ({processedReports.length})
              </h3>
              <div className="space-y-2">
                {processedReports.map((report) => (
                  <Card key={report.id} className="opacity-60">
                    <CardContent className="p-3 flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          report.status === "reviewed"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : "bg-muted/50 text-muted-foreground border-border"
                        }`}
                      >
                        {report.status === "reviewed" ? "Traité" : "Rejeté"}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${categoryColors[report.category] || categoryColors.autre}`}
                      >
                        {categoryLabels[report.category] || report.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {report.reason}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(report.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {reports.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Flag className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucun signalement</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Users / Bans Tab ─── */}
        <TabsContent value="users">
          {/* Active bans section */}
          {bans.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShieldBan className="h-4 w-4 text-red-500" />
                Utilisateurs bannis ({bans.length})
              </h3>
              <div className="space-y-2">
                {bans.map((ban) => (
                  <Card key={ban.id} className="border-red-500/20">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 font-semibold text-sm shrink-0">
                          {ban.user?.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium flex items-center gap-2">
                            {ban.user?.full_name || "Utilisateur"}
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20"
                            >
                              Banni
                            </Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Raison : {ban.reason} · Par{" "}
                            {ban.moderator?.full_name || "Admin"} ·{" "}
                            {formatDistanceToNow(new Date(ban.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-500/10 hover:border-green-500/30"
                        onClick={() => handleUnban(ban.user_id)}
                      >
                        <ShieldCheck className="h-4 w-4 mr-1.5" />
                        Débannir
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">
                Tous les utilisateurs ({members.length})
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <Card
                  key={member.id}
                  className={
                    member.is_banned ? "border-red-500/20 bg-red-500/5" : ""
                  }
                >
                  <CardContent className="p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${
                          member.is_banned
                            ? "bg-red-500/10 text-red-600"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <span className="truncate">
                            {member.full_name || "Sans nom"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0"
                          >
                            {member.role}
                          </Badge>
                          {member.is_banned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-red-500/10 text-red-600 border-red-500/20 shrink-0"
                            >
                              Banni
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    {!["admin", "manager"].includes(member.role) && (
                      <div className="shrink-0">
                        {member.is_banned ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-green-600 hover:text-green-700 hover:bg-green-500/10"
                            onClick={() => handleUnban(member.id)}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Débannir
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => setBanDialog(member.id)}
                          >
                            <ShieldBan className="h-4 w-4 mr-1" />
                            Bannir
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {members.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Users className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucun utilisateur</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Moderation Logs Tab ─── */}
        <TabsContent value="logs">
          <div className="space-y-2">
            {logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${
                      log.action === "delete"
                        ? "bg-red-500/10 text-red-600 border-red-500/20"
                        : log.action === "hide"
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-green-500/10 text-green-600 border-green-500/20"
                    }`}
                  >
                    {actionLabels[log.action] || log.action}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] shrink-0 ${categoryColors[log.category] || categoryColors.autre}`}
                  >
                    {categoryLabels[log.category] || log.category}
                  </Badge>
                  <span className="text-sm flex-1 truncate">{log.reason}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {log.moderator?.full_name || "Admin"} ·{" "}
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          {logs.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <History className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">Aucune action de modération</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Moderation Reason Dialog ─── */}
      <Dialog
        open={!!moderationDialog}
        onOpenChange={(open) => {
          if (!open) {
            setModerationDialog(null);
            setModReason("");
            setModCategory("autre");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {moderationDialog?.type === "hide"
                ? "Masquer le post"
                : "Supprimer le post"}
            </DialogTitle>
            <DialogDescription>
              {moderationDialog?.type === "hide"
                ? "Ce post sera masqué de la communauté."
                : "Ce post sera définitivement supprimé. Cette action est irréversible."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catégorie
              </Label>
              <Select value={modCategory} onValueChange={setModCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODERATION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Raison
              </Label>
              <Textarea
                value={modReason}
                onChange={(e) => setModReason(e.target.value)}
                placeholder="Décrivez la raison de cette modération..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModerationDialog(null);
                setModReason("");
                setModCategory("autre");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleModerate}
              disabled={!modReason.trim()}
              className={
                moderationDialog?.type === "delete"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : ""
              }
            >
              {moderationDialog?.type === "hide" ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Masquer
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Ban Confirmation Dialog ─── */}
      <Dialog
        open={!!banDialog}
        onOpenChange={(open) => {
          if (!open) {
            setBanDialog(null);
            setBanReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldBan className="h-5 w-5 text-red-500" />
              Bannir l&apos;utilisateur
            </DialogTitle>
            <DialogDescription>
              L&apos;utilisateur ne pourra plus publier de posts ni de
              commentaires dans la communauté.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Raison du bannissement
              </Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Décrivez la raison du bannissement..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBanDialog(null);
                setBanReason("");
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleBan}
              disabled={!banReason.trim()}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <ShieldBan className="h-4 w-4 mr-2" />
              Confirmer le bannissement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
