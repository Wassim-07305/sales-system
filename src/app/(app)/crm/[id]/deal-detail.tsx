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
import type {
  Deal,
  DealActivity,
  PipelineStage,
  DealActivityType,
} from "@/lib/types/database";
import {
  ArrowLeft,
  User,
  DollarSign,
  Phone,
  MessageSquare,
  Mail,
  Calendar,
  CalendarPlus,
  Clock,
  Edit2,
  Trash2,
  Plus,
  FileText,
  Target,
  TrendingUp,
  Thermometer,
  Linkedin,
  Instagram,
  MessageCircle,
} from "lucide-react";
import {
  updateDealStage,
  updateDealTemperature,
  updateDealNotes,
  updateDeal,
  addDealActivity,
  deleteDeal,
} from "@/lib/actions/crm";

interface DealDetailProps {
  deal: Deal;
  activities: DealActivity[];
  stages: PipelineStage[];
  teamMembers: Array<{ id: string; full_name: string | null; role: string }>;
}

const tempColors = {
  hot: "bg-red-500/10 text-red-600 border-red-500/20",
  warm: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  cold: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const activityIcons: Record<DealActivityType, typeof Phone> = {
  call: Phone,
  message: MessageSquare,
  email: Mail,
  note: FileText,
  meeting: Calendar,
  status_change: TrendingUp,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DealDetail({
  deal,
  activities,
  stages,
  teamMembers,
}: DealDetailProps) {
  const router = useRouter();
  const [currentDeal, setCurrentDeal] = useState(deal);
  const [notes, setNotes] = useState(deal.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: deal.title,
    value: deal.value,
    probability: deal.probability,
    source: deal.source || "",
    next_action: deal.next_action || "",
    next_action_date: deal.next_action_date?.split("T")[0] || "",
    assigned_to: deal.assigned_to || "",
  });

  // New activity state
  const [newActivity, setNewActivity] = useState({
    type: "note" as DealActivityType,
    content: "",
  });

  async function handleStageChange(stageId: string) {
    const result = await updateDealStage(currentDeal.id, stageId);
    if (result.error) {
      toast.error("Erreur lors de la mise a jour");
      return;
    }
    setCurrentDeal({ ...currentDeal, stage_id: stageId });
    toast.success("Stage mis a jour");
  }

  async function handleTempChange(temp: "hot" | "warm" | "cold") {
    const result = await updateDealTemperature(currentDeal.id, temp);
    if (result.error) {
      toast.error("Erreur");
      return;
    }
    setCurrentDeal({ ...currentDeal, temperature: temp });
    toast.success("Temperature mise a jour");
  }

  async function saveNotes() {
    setSavingNotes(true);
    const result = await updateDealNotes(currentDeal.id, notes);
    if (result.error) {
      toast.error("Erreur");
    } else {
      setCurrentDeal({ ...currentDeal, notes });
      toast.success("Notes enregistrees");
    }
    setSavingNotes(false);
  }

  async function handleEditSubmit() {
    const result = await updateDeal(currentDeal.id, {
      title: editForm.title,
      value: editForm.value,
      probability: editForm.probability,
      source: editForm.source || undefined,
      next_action: editForm.next_action || undefined,
      next_action_date: editForm.next_action_date || undefined,
      assigned_to: editForm.assigned_to || undefined,
    });

    if (result.error) {
      toast.error("Erreur lors de la mise a jour");
      return;
    }

    setCurrentDeal({
      ...currentDeal,
      ...editForm,
    });
    setEditOpen(false);
    toast.success("Deal mis a jour");
  }

  async function handleAddActivity() {
    if (!newActivity.content.trim()) {
      toast.error("Veuillez ajouter un contenu");
      return;
    }

    const result = await addDealActivity(
      currentDeal.id,
      newActivity.type,
      newActivity.content,
    );

    if (result.error) {
      toast.error("Erreur");
      return;
    }

    setNewActivity({ type: "note", content: "" });
    setActivityOpen(false);
    toast.success("Activité ajoutée");
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteDeal(currentDeal.id);
    if (result.error) {
      toast.error("Erreur lors de la suppression");
      setDeleting(false);
      return;
    }
    toast.success("Deal supprime");
    router.push("/crm");
  }

  return (
    <div>
      <PageHeader
        title={currentDeal.title}
        description={`Deal cree ${formatDistanceToNow(new Date(currentDeal.created_at), { addSuffix: true, locale: fr })}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/crm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Link>
          </Button>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" />
                Modifier
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Modifier le deal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Titre</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Valeur (EUR)</label>
                    <Input
                      type="number"
                      value={editForm.value}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          value: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Probabilite (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editForm.probability}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          probability: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Source</label>
                  <Input
                    value={editForm.source}
                    onChange={(e) =>
                      setEditForm({ ...editForm, source: e.target.value })
                    }
                    placeholder="ex: LinkedIn, Referral..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Assigne a</label>
                  <Select
                    value={editForm.assigned_to}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, assigned_to: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectionner un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name || "Sans nom"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Prochaine action
                  </label>
                  <Input
                    value={editForm.next_action}
                    onChange={(e) =>
                      setEditForm({ ...editForm, next_action: e.target.value })
                    }
                    placeholder="ex: Relancer par email"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Date prochaine action
                  </label>
                  <Input
                    type="date"
                    value={editForm.next_action_date}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        next_action_date: e.target.value,
                      })
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

          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/contracts/new?dealId=${currentDeal.id}&clientId=${currentDeal.contact_id || ""}&amount=${currentDeal.value}`}
            >
              <FileText className="h-4 w-4 mr-1" />
              Contrat
            </Link>
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/bookings/new?contactId=${currentDeal.contact_id || ""}&dealId=${currentDeal.id}`}
            >
              <CalendarPlus className="h-4 w-4 mr-1" />
              Booker un appel
            </Link>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce deal ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes les activités associées
                  seront également supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
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
          {/* Overview cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-brand" />
                  Valeur
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(currentDeal.value)}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1.5">
                  <Target className="h-3.5 w-3.5 text-brand" />
                  Probabilite
                </div>
                <p className="text-xl font-bold">{currentDeal.probability}%</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-brand" />
                  Valeur ponderee
                </div>
                <p className="text-xl font-bold">
                  {formatCurrency(
                    currentDeal.value * (currentDeal.probability / 100),
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-brand" />
                  Temperature
                </div>
                <div className="flex gap-1 mt-1">
                  {(["hot", "warm", "cold"] as const).map((temp) => (
                    <Badge
                      key={temp}
                      variant="outline"
                      className={`cursor-pointer text-xs ${
                        currentDeal.temperature === temp
                          ? tempColors[temp]
                          : "opacity-40 hover:opacity-70"
                      }`}
                      onClick={() => handleTempChange(temp)}
                    >
                      {temp === "hot"
                        ? "Hot"
                        : temp === "warm"
                          ? "Warm"
                          : "Cold"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stage selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {stages.map((stage) => (
                  <Button
                    key={stage.id}
                    variant={
                      currentDeal.stage_id === stage.id ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleStageChange(stage.id)}
                    className={
                      currentDeal.stage_id === stage.id
                        ? "bg-brand text-brand-dark hover:bg-brand/90"
                        : ""
                    }
                  >
                    <div
                      className="h-2 w-2 rounded-full mr-2"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activities timeline */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Historique des activités
              </CardTitle>
              <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvelle activité</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={newActivity.type}
                        onValueChange={(v) =>
                          setNewActivity({
                            ...newActivity,
                            type: v as DealActivityType,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Appel</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="message">Message</SelectItem>
                          <SelectItem value="meeting">Reunion</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contenu</label>
                      <Textarea
                        value={newActivity.content}
                        onChange={(e) =>
                          setNewActivity({
                            ...newActivity,
                            content: e.target.value,
                          })
                        }
                        placeholder="Décrivez l'activité..."
                        rows={4}
                      />
                    </div>
                    <Button
                      onClick={handleAddActivity}
                      className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                    >
                      Ajouter
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucune activité enregistrée
                </p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || FileText;
                    return (
                      <div key={activity.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted ring-1 ring-border/40 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {activity.user?.full_name || "Systeme"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {activity.type === "call"
                                ? "Appel"
                                : activity.type === "email"
                                  ? "Email"
                                  : activity.type === "message"
                                    ? "Message"
                                    : activity.type === "meeting"
                                      ? "Reunion"
                                      : activity.type === "status_change"
                                        ? "Changement"
                                        : "Note"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {activity.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(
                              new Date(activity.created_at),
                              "d MMM yyyy 'a' HH:mm",
                              {
                                locale: fr,
                              },
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact info */}
          {currentDeal.contact && (
            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
                    {currentDeal.contact.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {currentDeal.contact.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentDeal.contact.email}
                    </p>
                  </div>
                </div>
                {currentDeal.contact.phone && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {currentDeal.contact.phone}
                  </div>
                )}
                {currentDeal.contact.company && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {currentDeal.contact.company}
                  </div>
                )}
                {currentDeal.source && (
                  <div className="flex items-center gap-2 text-sm mt-2">
                    {currentDeal.source.toLowerCase().includes("linkedin") ? (
                      <Linkedin className="h-4 w-4 text-blue-400" />
                    ) : currentDeal.source
                        .toLowerCase()
                        .includes("instagram") ? (
                      <Instagram className="h-4 w-4 text-pink-400" />
                    ) : currentDeal.source
                        .toLowerCase()
                        .includes("whatsapp") ? (
                      <MessageCircle className="h-4 w-4 text-green-400" />
                    ) : null}
                    <span className="text-muted-foreground capitalize">
                      {currentDeal.source}
                    </span>
                  </div>
                )}
                <Separator className="my-4" />
                <Link
                  href={`/utilisateurs/${currentDeal.contact.id}`}
                  className="text-sm text-brand hover:underline"
                >
                  Voir la fiche utilisateur
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Next action */}
          {currentDeal.next_action && (
            <Card className="border-brand/20 bg-brand/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Prochaine action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{currentDeal.next_action}</p>
                {currentDeal.next_action_date && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(
                      new Date(currentDeal.next_action_date),
                      "EEEE d MMMM yyyy",
                      {
                        locale: fr,
                      },
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Assigned user */}
          {currentDeal.assigned_user && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Assigne a</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">
                    {currentDeal.assigned_user.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {currentDeal.assigned_user.full_name}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {currentDeal.assigned_user.role}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajouter des notes..."
                rows={6}
                className="mb-3"
              />
              <Button
                size="sm"
                onClick={saveNotes}
                disabled={savingNotes}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              >
                {savingNotes ? "Enregistrement..." : "Enregistrer les notes"}
              </Button>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {currentDeal.source && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source</span>
                  <span>{currentDeal.source}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cree le</span>
                <span>
                  {format(new Date(currentDeal.created_at), "d MMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </div>
              {currentDeal.last_contact_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernier contact</span>
                  <span>
                    {format(
                      new Date(currentDeal.last_contact_at),
                      "d MMM yyyy",
                      {
                        locale: fr,
                      },
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
