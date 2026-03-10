"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  AlertTriangle,
  Ban,
  MessageSquare,
  Settings,
  History,
  Check,
  Trash2,
  Volume2,
  VolumeX,
  UserX,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

import type {
  ModerationSettings,
  ReportedMessage,
  ModerationAction,
  ModeratedUser,
} from "@/lib/actions/moderation";
import {
  updateModerationSettings,
  moderateMessage,
  muteUser,
  unmuteUser,
  banUser,
  unbanUser,
} from "@/lib/actions/moderation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ModerationViewProps {
  settings: ModerationSettings;
  reportedMessages: ReportedMessage[];
  users: ModeratedUser[];
  log: ModerationAction[];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ModerationView({
  settings: initialSettings,
  reportedMessages,
  users,
  log,
}: ModerationViewProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Modération du chat"
        description="Gérez les messages signalés, les utilisateurs et les paramètres de modération."
      >
        <Badge variant="outline" className="gap-1.5">
          <Shield className="size-3.5" />
          Admin
        </Badge>
      </PageHeader>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="messages" className="gap-1.5">
            <AlertTriangle className="size-3.5" />
            Messages signalés
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5">
            <Ban className="size-3.5" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="size-3.5" />
            Paramètres
          </TabsTrigger>
          <TabsTrigger value="log" className="gap-1.5">
            <History className="size-3.5" />
            Journal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="messages">
          <ReportedMessagesTab messages={reportedMessages} />
        </TabsContent>

        <TabsContent value="users">
          <UsersTab users={users} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab settings={initialSettings} />
        </TabsContent>

        <TabsContent value="log">
          <LogTab log={log} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reported Messages Tab
// ---------------------------------------------------------------------------

function ReportedMessagesTab({ messages }: { messages: ReportedMessage[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction(
    reportId: string,
    action: "resolve" | "dismiss" | "review",
    resolution?: string
  ) {
    startTransition(async () => {
      try {
        await moderateMessage(reportId, action, resolution);
        const labels = {
          resolve: "Signalement résolu",
          dismiss: "Signalement rejeté",
          review: "Signalement en revue",
        };
        toast.success(labels[action]);
        router.refresh();
      } catch {
        toast.error("Erreur lors de la modération");
      }
    });
  }

  const pendingMessages = messages.filter((m) => m.status === "pending");
  const resolvedMessages = messages.filter((m) => m.status !== "pending");

  return (
    <div className="space-y-4">
      {pendingMessages.length === 0 && resolvedMessages.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Aucun message signalé pour le moment.
            </p>
          </CardContent>
        </Card>
      )}

      {pendingMessages.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            En attente ({pendingMessages.length})
          </h3>
          {pendingMessages.map((msg) => (
            <ReportedMessageCard
              key={msg.id}
              message={msg}
              onAction={handleAction}
              isPending={isPending}
            />
          ))}
        </div>
      )}

      {resolvedMessages.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Traités ({resolvedMessages.length})
          </h3>
          {resolvedMessages.map((msg) => (
            <ReportedMessageCard
              key={msg.id}
              message={msg}
              onAction={handleAction}
              isPending={isPending}
              resolved
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportedMessageCard({
  message,
  onAction,
  isPending,
  resolved,
}: {
  message: ReportedMessage;
  onAction: (id: string, action: "resolve" | "dismiss" | "review", resolution?: string) => void;
  isPending: boolean;
  resolved?: boolean;
}) {
  const statusBadge: Record<string, React.ReactNode> = {
    pending: (
      <Badge variant="outline" className="text-amber-500 border-amber-500/30">
        En attente
      </Badge>
    ),
    reviewed: (
      <Badge variant="outline" className="text-blue-500 border-blue-500/30">
        En revue
      </Badge>
    ),
    resolved: (
      <Badge variant="outline" className="text-green-500 border-green-500/30">
        Résolu
      </Badge>
    ),
    dismissed: (
      <Badge variant="outline" className="text-gray-500 border-gray-500/30">
        Rejeté
      </Badge>
    ),
  };

  const priorityBadge: Record<string, React.ReactNode> = {
    low: null,
    medium: null,
    high: (
      <Badge variant="outline" className="text-orange-500 border-orange-500/30">
        Priorité haute
      </Badge>
    ),
    critical: (
      <Badge variant="outline" className="text-red-500 border-red-500/30">
        Critique
      </Badge>
    ),
  };

  return (
    <Card className={resolved ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {message.author_name}
              </span>
              <span className="text-muted-foreground text-xs">
                dans #{message.channel_name}
              </span>
              {statusBadge[message.status]}
              {priorityBadge[message.priority]}
            </div>

            <div className="bg-muted/50 rounded-md p-3 text-sm">
              {message.content}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Signalé par{" "}
                <span className="font-medium">{message.reporter_name}</span>
              </span>
              <span>Raison : {message.reason}</span>
              <span>
                {formatDistanceToNow(new Date(message.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          </div>

          {!resolved && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-950/30"
                onClick={() => onAction(message.id, "dismiss")}
                disabled={isPending}
              >
                <Check className="size-3.5 mr-1" />
                Rejeter
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => onAction(message.id, "resolve", "deleted")}
                disabled={isPending}
              >
                <Trash2 className="size-3.5 mr-1" />
                Supprimer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                onClick={() => onAction(message.id, "resolve", "approved")}
                disabled={isPending}
              >
                <Check className="size-3.5 mr-1" />
                Résoudre
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Users Tab
// ---------------------------------------------------------------------------

function UsersTab({ users }: { users: ModeratedUser[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [muteDuration, setMuteDuration] = useState("15");

  const filteredUsers = users.filter(
    (u) =>
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  function handleMute(userId: string) {
    startTransition(async () => {
      try {
        // Convert minutes to hours for the new API
        const durationHours = parseInt(muteDuration) / 60;
        await muteUser(userId, durationHours, "Mute manuel depuis le panneau de moderation");
        toast.success(`Utilisateur muté pour ${muteDuration} minutes`);
        router.refresh();
      } catch {
        toast.error("Erreur lors du mute");
      }
    });
  }

  function handleUnmute(userId: string) {
    startTransition(async () => {
      try {
        await unmuteUser(userId);
        toast.success("Utilisateur démuté");
        router.refresh();
      } catch {
        toast.error("Erreur lors du unmute");
      }
    });
  }

  function handleBan(userId: string) {
    if (!banReason.trim()) {
      toast.error("Veuillez indiquer une raison");
      return;
    }
    startTransition(async () => {
      try {
        await banUser(userId, banReason);
        toast.success("Utilisateur banni");
        setBanTargetId(null);
        setBanReason("");
        router.refresh();
      } catch {
        toast.error("Erreur lors du ban");
      }
    });
  }

  function handleUnban(userId: string) {
    startTransition(async () => {
      try {
        await unbanUser(userId);
        toast.success("Utilisateur débanni");
        router.refresh();
      } catch {
        toast.error("Erreur lors du unban");
      }
    });
  }

  const statusBadge = (status: ModeratedUser["status"]) => {
    switch (status) {
      case "actif":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500/30">
            Actif
          </Badge>
        );
      case "mute":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/30">
            Muté
          </Badge>
        );
      case "banni":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500/30">
            Banni
          </Badge>
        );
      case "restreint":
        return (
          <Badge variant="outline" className="text-orange-500 border-orange-500/30">
            Restreint
          </Badge>
        );
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      manager: "bg-purple-900/30 text-purple-400",
      setter: "bg-blue-900/30 text-blue-400",
      closer: "bg-orange-900/30 text-orange-400",
      client_b2b: "bg-emerald-900/30 text-emerald-400",
      client_b2c: "bg-teal-900/30 text-teal-400",
    };
    return (
      <Badge className={colors[role] || "bg-gray-900/30 text-gray-400"}>
        {role}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="mute-duration" className="text-sm text-muted-foreground whitespace-nowrap">
            Durée du mute :
          </Label>
          <Select value={muteDuration} onValueChange={setMuteDuration}>
            <SelectTrigger id="mute-duration" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 min</SelectItem>
              <SelectItem value="15">15 min</SelectItem>
              <SelectItem value="60">1 heure</SelectItem>
              <SelectItem value="1440">24 heures</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Aucun utilisateur trouvé.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                      {(u.full_name || u.email)[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {u.full_name || u.email}
                        </span>
                        {roleBadge(u.role)}
                        {statusBadge(u.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      {u.status === "mute" && u.muted_until && (
                        <p className="text-xs text-amber-500 mt-0.5">
                          Muté jusqu&apos;au{" "}
                          {format(new Date(u.muted_until), "dd/MM HH:mm", {
                            locale: fr,
                          })}
                        </p>
                      )}
                      {u.status === "banni" && u.ban_reason && (
                        <p className="text-xs text-red-500 mt-0.5">
                          Raison : {u.ban_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.status === "actif" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-amber-600 hover:bg-amber-950/30"
                          onClick={() => handleMute(u.id)}
                          disabled={isPending}
                        >
                          <VolumeX className="size-3.5 mr-1" />
                          Muter
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-950/30"
                          onClick={() =>
                            setBanTargetId(banTargetId === u.id ? null : u.id)
                          }
                          disabled={isPending}
                        >
                          <UserX className="size-3.5 mr-1" />
                          Bannir
                        </Button>
                      </>
                    )}
                    {u.status === "mute" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-950/30"
                        onClick={() => handleUnmute(u.id)}
                        disabled={isPending}
                      >
                        <Volume2 className="size-3.5 mr-1" />
                        Démuter
                      </Button>
                    )}
                    {u.status === "banni" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-950/30"
                        onClick={() => handleUnban(u.id)}
                        disabled={isPending}
                      >
                        <UserCheck className="size-3.5 mr-1" />
                        Débannir
                      </Button>
                    )}
                  </div>
                </div>

                {banTargetId === u.id && (
                  <div className="mt-3 flex items-end gap-2 pt-3 border-t border-border/50">
                    <div className="flex-1">
                      <Label
                        htmlFor={`ban-reason-${u.id}`}
                        className="text-xs text-muted-foreground mb-1 block"
                      >
                        Raison du bannissement
                      </Label>
                      <Input
                        id={`ban-reason-${u.id}`}
                        placeholder="Ex: Comportement abusif répété"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleBan(u.id)}
                      disabled={isPending || !banReason.trim()}
                    >
                      Confirmer le ban
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setBanTargetId(null);
                        setBanReason("");
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings Tab
// ---------------------------------------------------------------------------

function SettingsTab({ settings }: { settings: ModerationSettings }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [blockedWords, setBlockedWords] = useState(
    settings.blocked_words.join("\n")
  );
  const [floodLimit, setFloodLimit] = useState(settings.flood_limit);
  const [autoDeleteLinks, setAutoDeleteLinks] = useState(
    settings.auto_delete_links
  );
  const [profanityFilter, setProfanityFilter] = useState(
    settings.profanity_filter
  );

  function handleSave() {
    startTransition(async () => {
      try {
        await updateModerationSettings({
          id: settings.id,
          blocked_words: blockedWords
            .split("\n")
            .map((w) => w.trim())
            .filter(Boolean),
          flood_limit: floodLimit,
          auto_delete_links: autoDeleteLinks,
          profanity_filter: profanityFilter,
        });
        toast.success("Paramètres de modération sauvegardés");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la sauvegarde");
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-[#7af17a]" />
            Filtre de mots
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="blocked-words">
            Mots bloqués (un par ligne)
          </Label>
          <Textarea
            id="blocked-words"
            rows={8}
            placeholder={"mot1\nmot2\nmot3"}
            value={blockedWords}
            onChange={(e) => setBlockedWords(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Les messages contenant ces mots seront automatiquement signalés.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            Protection anti-flood
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flood-limit">
              Messages max par minute : {floodLimit}
            </Label>
            <input
              id="flood-limit"
              type="range"
              min={1}
              max={30}
              value={floodLimit}
              onChange={(e) => setFloodLimit(parseInt(e.target.value))}
              className="w-full accent-[#7af17a]"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="size-4" />
            Options automatiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-delete-links" className="font-medium">
                Suppression automatique des liens
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supprime automatiquement les messages contenant des URLs.
              </p>
            </div>
            <Switch
              id="auto-delete-links"
              checked={autoDeleteLinks}
              onCheckedChange={setAutoDeleteLinks}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="profanity-filter" className="font-medium">
                Filtre anti-grossièretés
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active le filtre automatique des grossièretés connues.
              </p>
            </div>
            <Switch
              id="profanity-filter"
              checked={profanityFilter}
              onCheckedChange={setProfanityFilter}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={isPending}
        className="bg-[#7af17a] text-[#14080e] hover:bg-[#6ae06a]"
      >
        {isPending ? "Sauvegarde..." : "Sauvegarder les paramètres"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Log Tab
// ---------------------------------------------------------------------------

function LogTab({ log }: { log: ModerationAction[] }) {
  const actionIcons: Record<string, React.ReactNode> = {
    mute: <VolumeX className="size-3.5 text-amber-500" />,
    unmute: <Volume2 className="size-3.5 text-green-500" />,
    ban: <Ban className="size-3.5 text-red-500" />,
    unban: <UserCheck className="size-3.5 text-green-500" />,
    message_approve: <Check className="size-3.5 text-green-500" />,
    message_delete: <Trash2 className="size-3.5 text-red-500" />,
    message_warn: <AlertTriangle className="size-3.5 text-amber-500" />,
    settings_update: <Settings className="size-3.5 text-blue-500" />,
  };

  if (log.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="size-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            Aucune action de modération enregistrée.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {log.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              {actionIcons[entry.action_type] || (
                <Shield className="size-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{entry.moderator_name}</span>
                <span className="text-muted-foreground"> — </span>
                <span>{entry.details}</span>
                {entry.target_user_name && (
                  <span className="text-muted-foreground">
                    {" "}
                    (cible : {entry.target_user_name})
                  </span>
                )}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(entry.created_at), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
