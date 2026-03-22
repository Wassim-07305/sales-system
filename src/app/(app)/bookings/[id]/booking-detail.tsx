"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
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
import { cn } from "@/lib/utils";
import type { Booking, BookingStatus } from "@/lib/types/database";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  Phone,
  Video,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  FileText,
  Loader2,
  TrendingUp,
  Timer,
} from "lucide-react";
import {
  updateBookingStatus,
  updateBooking,
  rescheduleBooking,
  deleteBooking,
} from "@/lib/actions/bookings";
import { createDealFromBooking } from "@/lib/actions/crm";

interface BookingDetailProps {
  booking: Booking;
  teamMembers: Array<{ id: string; full_name: string | null; role: string }>;
}

const statusConfig: Record<
  BookingStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle }
> = {
  confirmed: {
    label: "Confirmé",
    color: "text-blue-600",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: Calendar,
  },
  completed: {
    label: "Terminé",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: CheckCircle,
  },
  no_show: {
    label: "No-show",
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  cancelled: {
    label: "Annulé",
    color: "text-muted-foreground",
    bg: "bg-muted/50 border-border/50",
    icon: XCircle,
  },
  rescheduled: {
    label: "Reprogrammé",
    color: "text-orange-600",
    bg: "bg-orange-500/10 border-orange-500/20",
    icon: RefreshCw,
  },
};

const slotTypeLabels: Record<string, string> = {
  discovery: "Appel découverte",
  decouverte: "Appel découverte",
  demo: "Démo produit",
  closing: "Appel closing",
  follow_up: "Suivi",
  suivi: "Suivi",
  coaching: "Coaching",
  autre: "Autre",
};

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-purple-600",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function BookingDetail({ booking, teamMembers }: BookingDetailProps) {
  const router = useRouter();
  const [currentBooking, setCurrentBooking] = useState(booking);
  const [editOpen, setEditOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [convertingToDeal, setConvertingToDeal] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  const [editForm, setEditForm] = useState({
    prospect_name: booking.prospect_name,
    prospect_email: booking.prospect_email || "",
    prospect_phone: booking.prospect_phone || "",
    slot_type: booking.slot_type,
    duration_minutes: booking.duration_minutes,
    notes: booking.notes || "",
    assigned_to: booking.assigned_to || "",
    meeting_link: booking.meeting_link || "",
  });

  const statusInfo = statusConfig[currentBooking.status];
  const StatusIcon = statusInfo.icon;
  const scheduledDate = new Date(currentBooking.scheduled_at);
  const isUpcoming = isFuture(scheduledDate);
  const isPastBooking = isPast(scheduledDate);

  async function handleStatusChange(status: BookingStatus) {
    setStatusLoading(status);
    const result = await updateBookingStatus(currentBooking.id, status);
    setStatusLoading(null);
    if (result.error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    setCurrentBooking({ ...currentBooking, status });
    toast.success("Statut mis à jour");
  }

  async function handleEditSubmit() {
    setSaving(true);
    const result = await updateBooking(currentBooking.id, editForm);
    setSaving(false);
    if (result.error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    setCurrentBooking({ ...currentBooking, ...editForm });
    setEditOpen(false);
    toast.success("Booking mis à jour");
  }

  async function handleReschedule() {
    if (!newDate || !newTime) {
      toast.error("Veuillez choisir une date et heure");
      return;
    }
    setSaving(true);
    const newDateTime = `${newDate}T${newTime}:00`;
    const result = await rescheduleBooking(currentBooking.id, newDateTime);
    setSaving(false);
    if (result.error) {
      toast.error("Erreur lors du report");
      return;
    }
    setCurrentBooking({
      ...currentBooking,
      scheduled_at: newDateTime,
      status: "rescheduled",
    });
    setRescheduleOpen(false);
    setNewDate("");
    setNewTime("");
    toast.success("Booking reprogrammé");
  }

  async function handleConvertToDeal() {
    setConvertingToDeal(true);
    const result = await createDealFromBooking({
      prospectName: currentBooking.prospect_name,
      prospectEmail: currentBooking.prospect_email || undefined,
      slotType: currentBooking.slot_type,
    });
    setConvertingToDeal(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Deal créé avec succès !");
    if (result.deal?.id) router.push(`/crm/${result.deal.id}`);
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteBooking(currentBooking.id);
    if (result.error) {
      toast.error("Erreur lors de la suppression");
      setDeleting(false);
      return;
    }
    toast.success("Booking supprimé");
    router.push("/bookings");
  }

  return (
    <div>
      <PageHeader
        title={`Booking avec ${currentBooking.prospect_name}`}
        description={format(scheduledDate, "EEEE d MMMM yyyy 'à' HH:mm", {
          locale: fr,
        })}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="h-8">
            <Link href="/bookings">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Retour
            </Link>
          </Button>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                Modifier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle>Modifier le booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Nom du prospect
                  </label>
                  <Input
                    value={editForm.prospect_name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        prospect_name: e.target.value,
                      })
                    }
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={editForm.prospect_email}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          prospect_email: e.target.value,
                        })
                      }
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Téléphone
                    </label>
                    <Input
                      value={editForm.prospect_phone}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          prospect_phone: e.target.value,
                        })
                      }
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Type de RDV
                    </label>
                    <Select
                      value={editForm.slot_type}
                      onValueChange={(v) =>
                        setEditForm({ ...editForm, slot_type: v })
                      }
                    >
                      <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discovery">
                          Appel découverte
                        </SelectItem>
                        <SelectItem value="demo">Démo produit</SelectItem>
                        <SelectItem value="closing">Appel closing</SelectItem>
                        <SelectItem value="follow_up">Suivi</SelectItem>
                        <SelectItem value="coaching">Coaching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Durée (min)
                    </label>
                    <Input
                      type="number"
                      value={editForm.duration_minutes}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          duration_minutes: Number(e.target.value),
                        })
                      }
                      className="mt-1.5 h-11 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Assigné à
                  </label>
                  <Select
                    value={editForm.assigned_to}
                    onValueChange={(v) =>
                      setEditForm({ ...editForm, assigned_to: v })
                    }
                  >
                    <SelectTrigger className="mt-1.5 h-11 rounded-xl">
                      <SelectValue placeholder="Sélectionner un membre" />
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
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Lien de réunion
                  </label>
                  <Input
                    value={editForm.meeting_link}
                    onChange={(e) =>
                      setEditForm({ ...editForm, meeting_link: e.target.value })
                    }
                    placeholder="https://meet.google.com/..."
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Notes
                  </label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm({ ...editForm, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                </div>
                <Button
                  onClick={handleEditSubmit}
                  className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reporter
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Reporter le booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Nouvelle date
                  </label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Nouvelle heure
                  </label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="mt-1.5 h-11 rounded-xl"
                  />
                </div>
                <Button
                  onClick={handleReschedule}
                  className="w-full bg-emerald-500 text-black hover:bg-emerald-400"
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {saving ? "Report en cours..." : "Confirmer le report"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce booking ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le rendez-vous sera
                  définitivement supprimé.
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

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status and date card */}
          <Card className="overflow-hidden rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-0">
              {/* Status banner */}
              <div
                className={cn(
                  "px-6 py-4 border-b flex items-center justify-between",
                  statusInfo.bg,
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center bg-background/50",
                      statusInfo.color,
                    )}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p
                      className={cn("font-semibold text-sm", statusInfo.color)}
                    >
                      {statusInfo.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isUpcoming
                        ? `Dans ${formatDistanceToNow(scheduledDate, { locale: fr })}`
                        : `Il y a ${formatDistanceToNow(scheduledDate, { locale: fr })}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-medium">
                  {slotTypeLabels[currentBooking.slot_type] ||
                    currentBooking.slot_type}
                </Badge>
              </div>

              {/* Date/time grid */}
              <div className="px-6 py-5 grid grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Date
                    </p>
                    <p className="text-sm font-medium">
                      {format(scheduledDate, "EEEE d MMMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Heure
                    </p>
                    <p className="text-sm font-medium">
                      {format(scheduledDate, "HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Timer className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Durée
                    </p>
                    <p className="text-sm font-medium">
                      {currentBooking.duration_minutes} min
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick status actions */}
          {currentBooking.status === "confirmed" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {isPastBooking && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange("completed")}
                        className="h-9 gap-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        disabled={!!statusLoading}
                      >
                        {statusLoading === "completed" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        Marquer terminé
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange("no_show")}
                        className="h-9 gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={!!statusLoading}
                      >
                        {statusLoading === "no_show" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        No-show
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("cancelled")}
                    className="h-9 gap-1.5"
                    disabled={!!statusLoading}
                  >
                    {statusLoading === "cancelled" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Convert to deal */}
          {currentBooking.status === "completed" && (
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Booking terminé</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Convertir ce prospect en deal dans le CRM
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleConvertToDeal}
                  disabled={convertingToDeal}
                  className="bg-emerald-500 text-black hover:bg-emerald-400 gap-1.5"
                >
                  {convertingToDeal ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <TrendingUp className="h-3.5 w-3.5" />
                  )}
                  {convertingToDeal ? "Conversion..." : "Convertir en deal"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Meeting link */}
          {currentBooking.meeting_link && (
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Video className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-sm">Lien de réunion</span>
                </div>
                <Button
                  size="sm"
                  asChild
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  <a
                    href={currentBooking.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Rejoindre
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {currentBooking.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {currentBooking.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Reliability score */}
          {currentBooking.reliability_score > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Score de fiabilité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-5">
                  <div className="relative h-20 w-20 shrink-0">
                    <svg className="h-20 w-20 -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-muted/30"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${currentBooking.reliability_score * 2.26} 226`}
                        className={cn(
                          currentBooking.reliability_score >= 70
                            ? "stroke-emerald-500"
                            : currentBooking.reliability_score >= 40
                              ? "stroke-amber-500"
                              : "stroke-red-500",
                        )}
                      />
                    </svg>
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center text-lg font-bold",
                        currentBooking.reliability_score >= 70
                          ? "text-emerald-500"
                          : currentBooking.reliability_score >= 40
                            ? "text-amber-500"
                            : "text-red-500",
                      )}
                    >
                      {currentBooking.reliability_score}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {currentBooking.reliability_score >= 70
                      ? "Prospect très fiable — haute probabilité de présence"
                      : currentBooking.reliability_score >= 40
                        ? "Fiabilité moyenne — envisagez une confirmation"
                        : "Faible fiabilité — confirmez avant le RDV"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Prospect info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Prospect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0",
                    getAvatarColor(currentBooking.prospect_name || "?"),
                  )}
                >
                  {(currentBooking.prospect_name || "?")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    {currentBooking.prospect_name || "Prospect"}
                  </p>
                </div>
              </div>

              <Separator />

              {currentBooking.prospect_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${currentBooking.prospect_email}`}
                    className="text-sm hover:underline truncate"
                  >
                    {currentBooking.prospect_email}
                  </a>
                </div>
              )}

              {currentBooking.prospect_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`tel:${currentBooking.prospect_phone}`}
                    className="text-sm hover:underline"
                  >
                    {currentBooking.prospect_phone}
                  </a>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                {currentBooking.prospect_phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 gap-1.5"
                    asChild
                  >
                    <a href={`tel:${currentBooking.prospect_phone}`}>
                      <Phone className="h-3.5 w-3.5" />
                      Appeler
                    </a>
                  </Button>
                )}
                {currentBooking.prospect_email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-9 gap-1.5"
                    asChild
                  >
                    <a href={`mailto:${currentBooking.prospect_email}`}>
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned user */}
          {currentBooking.assigned_user && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Assigné à
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold",
                      getAvatarColor(
                        currentBooking.assigned_user.full_name || "?",
                      ),
                    )}
                  >
                    {currentBooking.assigned_user.full_name
                      ?.charAt(0)
                      ?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {currentBooking.assigned_user.full_name}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize mt-0.5"
                    >
                      {currentBooking.assigned_user.role}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Informations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">Créé le</span>
                <span className="text-xs font-medium">
                  {format(new Date(currentBooking.created_at), "d MMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground text-xs">
                  Rappel envoyé
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    currentBooking.reminder_sent
                      ? "text-emerald-600"
                      : "text-muted-foreground",
                  )}
                >
                  {currentBooking.reminder_sent ? "Oui" : "Non"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
