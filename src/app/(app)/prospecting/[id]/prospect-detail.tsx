"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import type {
  Prospect,
  ProspectScore,
  ProspectList,
  PipelineStage,
} from "@/lib/types/database";
import {
  ArrowLeft,
  User,
  MessageSquare,
  Send,
  Edit2,
  Trash2,
  ExternalLink,
  Thermometer,
  Target,
  Linkedin,
  Instagram,
  ArrowRightCircle,
} from "lucide-react";
import {
  updateProspect,
  updateProspectStatus,
  addProspectMessage,
  deleteProspect,
  convertProspectToDeal,
} from "@/lib/actions/prospecting";

interface ProspectDetailProps {
  prospect: Prospect & {
    list?: ProspectList | null;
    assigned_setter?: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  };
  score: ProspectScore | null;
  lists: ProspectList[];
  setters: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  stages: PipelineStage[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new: {
    label: "Nouveau",
    color: "bg-muted/40 text-muted-foreground/60 border-border/30",
  },
  contacted: {
    label: "Contacté",
    color: "bg-muted/60 text-muted-foreground border-border/50",
  },
  replied: {
    label: "A répondu",
    color: "bg-brand/10 text-brand border-brand/20",
  },
  booked: {
    label: "RDV pris",
    color: "bg-foreground/10 text-foreground border-foreground/20",
  },
  not_interested: {
    label: "Pas intéressé",
    color: "bg-muted/50 text-muted-foreground border-border/50",
  },
};

const tempColors: Record<string, string> = {
  hot: "bg-foreground/10 text-foreground border-foreground/20",
  warm: "bg-muted/60 text-muted-foreground border-border/50",
  cold: "bg-muted/40 text-muted-foreground/60 border-border/30",
};

const platformIcons: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  instagram: Instagram,
};

export function ProspectDetail({
  prospect,
  score,
  lists,
  setters,
  stages,
}: ProspectDetailProps) {
  const router = useRouter();
  const [currentProspect, setCurrentProspect] = useState(prospect);
  const [notes, setNotes] = useState(prospect.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: prospect.name,
    profile_url: prospect.profile_url || "",
    platform: prospect.platform || "linkedin",
    list_id: prospect.list_id || "",
    assigned_setter_id: prospect.assigned_setter_id || "",
    auto_follow_up: prospect.auto_follow_up,
  });

  // Convert to deal form
  const [dealForm, setDealForm] = useState({
    title: `Deal - ${prospect.name}`,
    value: 0,
    stage_id: stages[0]?.id || "",
  });

  const statusInfo = statusConfig[currentProspect.status] || statusConfig.new;
  const PlatformIcon = platformIcons[currentProspect.platform || ""] || User;
  const conversationHistory = Array.isArray(
    currentProspect.conversation_history,
  )
    ? currentProspect.conversation_history
    : [];

  async function handleStatusChange(status: string) {
    try {
      await updateProspectStatus(currentProspect.id, status);
      setCurrentProspect({
        ...currentProspect,
        status: status as Prospect["status"],
      });
      toast.success("Statut mis a jour");
    } catch {
      toast.error("Erreur lors de la mise a jour");
    }
  }

  async function handleEditSubmit() {
    const result = await updateProspect(currentProspect.id, editForm);

    if (result.error) {
      toast.error("Erreur lors de la mise a jour");
      return;
    }

    setCurrentProspect({
      ...currentProspect,
      ...editForm,
    });
    setEditOpen(false);
    toast.success("Prospect mis a jour");
  }

  async function saveNotes() {
    setSavingNotes(true);
    const result = await updateProspect(currentProspect.id, { notes });
    if (result.error) {
      toast.error("Erreur");
    } else {
      setCurrentProspect({ ...currentProspect, notes });
      toast.success("Notes enregistrees");
    }
    setSavingNotes(false);
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSendingMessage(true);

    const result = await addProspectMessage(
      currentProspect.id,
      newMessage,
      "sent",
    );

    if (result.error) {
      toast.error("Erreur");
    } else {
      setCurrentProspect({
        ...currentProspect,
        conversation_history: [
          ...conversationHistory,
          {
            id: crypto.randomUUID(),
            content: newMessage,
            direction: "sent",
            timestamp: new Date().toISOString(),
          },
        ],
        last_message_at: new Date().toISOString(),
      });
      setNewMessage("");
      toast.success("Message enregistre");
    }
    setSendingMessage(false);
  }

  async function handleConvertToDeal() {
    if (!dealForm.title || !dealForm.stage_id) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    const result = await convertProspectToDeal(currentProspect.id, dealForm);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Prospect converti en deal");
    router.push(`/crm/${result.dealId}`);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteProspect(currentProspect.id);
      toast.success("Prospect supprime");
      router.push("/prospecting");
    } catch {
      toast.error("Erreur lors de la suppression");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={currentProspect.name}
        description={`Prospect ${currentProspect.platform || "inconnu"} - ajoute ${formatDistanceToNow(new Date(currentProspect.created_at), { addSuffix: true, locale: fr })}`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-medium"
            asChild
          >
            <Link href="/prospecting">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Link>
          </Button>

          <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
              >
                <ArrowRightCircle className="h-4 w-4 mr-1" />
                Convertir en deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convertir en deal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Titre du deal</label>
                  <Input
                    value={dealForm.title}
                    onChange={(e) =>
                      setDealForm({ ...dealForm, title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Valeur (EUR)</label>
                  <Input
                    type="number"
                    value={dealForm.value}
                    onChange={(e) =>
                      setDealForm({
                        ...dealForm,
                        value: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Stage initial</label>
                  <Select
                    value={dealForm.stage_id}
                    onValueChange={(v) =>
                      setDealForm({ ...dealForm, stage_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleConvertToDeal}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  Creer le deal
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modifier le prospect</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Nom</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">URL du profil</label>
                  <Input
                    value={editForm.profile_url}
                    onChange={(e) =>
                      setEditForm({ ...editForm, profile_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Plateforme</label>
                  <Select
                    value={editForm.platform}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, platform: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Liste</label>
                  <Select
                    value={editForm.list_id}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, list_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune liste" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune liste</SelectItem>
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Assigne a</label>
                  <Select
                    value={editForm.assigned_setter_id}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, assigned_setter_id: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Non assigne" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Non assigne</SelectItem>
                      {setters.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name || "Sans nom"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Relance automatique
                  </label>
                  <Switch
                    checked={editForm.auto_follow_up}
                    onCheckedChange={(c) =>
                      setEditForm({ ...editForm, auto_follow_up: c })
                    }
                  />
                </div>
                <Button
                  onClick={handleEditSubmit}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  Enregistrer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irreversible. L&apos;historique des
                  conversations sera perdu.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleting ? "Suppression..." : "Supprimer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status and score */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Target className="h-3 w-3" />
                  Statut
                </div>
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
              </CardContent>
            </Card>
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Thermometer className="h-3 w-3" />
                  Temperature
                </div>
                {score ? (
                  <Badge
                    className={tempColors[score.temperature] || tempColors.cold}
                  >
                    {score.temperature === "hot"
                      ? "Hot"
                      : score.temperature === "warm"
                        ? "Warm"
                        : "Cold"}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Non calcule
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Target className="h-3 w-3" />
                  Score total
                </div>
                <p className="text-xl font-bold">{score?.total_score ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Messages
                </div>
                <p className="text-xl font-bold">
                  {conversationHistory.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Status change */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Changer le statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(statusConfig).map(([status, config]) => (
                  <Button
                    key={status}
                    variant={
                      currentProspect.status === status ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleStatusChange(status)}
                    className={`rounded-xl font-medium ${
                      currentProspect.status === status
                        ? "bg-brand text-brand-dark hover:bg-brand/90"
                        : ""
                    }`}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversation history */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Historique des conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {conversationHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun message enregistre
                </p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                  {conversationHistory.map((msg: Record<string, unknown>) => (
                    <div
                      key={msg.id as string}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.direction === "sent"
                          ? "bg-brand/10 ml-auto"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{msg.content as string}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(
                          new Date(msg.timestamp as string),
                          "d MMM HH:mm",
                          { locale: fr },
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-4" />

              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Enregistrer un nouveau message..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="bg-brand text-brand-dark hover:bg-brand/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile info */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center">
                  <PlatformIcon className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <p className="font-medium">{currentProspect.name}</p>
                  <Badge variant="outline" className="text-xs capitalize">
                    {currentProspect.platform || "Inconnu"}
                  </Badge>
                </div>
              </div>

              {currentProspect.profile_url && (
                <>
                  <Separator />
                  <a
                    href={currentProspect.profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Voir le profil
                  </a>
                </>
              )}

              {currentProspect.list && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Liste:</span>{" "}
                    <span className="font-medium">
                      {currentProspect.list.name}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Assigned setter */}
          {currentProspect.assigned_setter && (
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Assigne a</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">
                    {currentProspect.assigned_setter.full_name?.charAt(0) ||
                      "?"}
                  </div>
                  <p className="font-medium">
                    {currentProspect.assigned_setter.full_name}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score details */}
          {score && (
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Details du score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Engagement</span>
                  <span className="font-medium">{score.engagement_score}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Réactivité</span>
                  <span className="font-medium">
                    {score.responsiveness_score}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Qualification</span>
                  <span className="font-medium">
                    {score.qualification_score}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-medium">
                  <span>Total</span>
                  <span>{score.total_score}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter des notes..."
                rows={4}
                className="mb-3"
              />
              <Button
                size="sm"
                onClick={saveNotes}
                disabled={savingNotes}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90 rounded-xl font-medium"
              >
                {savingNotes ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="shadow-sm rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Metadonnees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cree le</span>
                <span>
                  {format(new Date(currentProspect.created_at), "d MMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </div>
              {currentProspect.last_message_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernier message</span>
                  <span>
                    {format(
                      new Date(currentProspect.last_message_at),
                      "d MMM yyyy",
                      { locale: fr },
                    )}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Relance auto</span>
                <span>{currentProspect.auto_follow_up ? "Oui" : "Non"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
