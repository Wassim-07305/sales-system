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

const statusConfig: Record<BookingStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  confirmed: { label: "Confirme", color: "bg-blue-100 text-blue-700", icon: Calendar },
  completed: { label: "Termine", color: "bg-green-100 text-green-700", icon: CheckCircle },
  no_show: { label: "No-show", color: "bg-red-100 text-red-700", icon: XCircle },
  cancelled: { label: "Annule", color: "bg-gray-100 text-gray-600", icon: XCircle },
  rescheduled: { label: "Reprogramme", color: "bg-orange-100 text-orange-700", icon: RefreshCw },
};

const slotTypeLabels: Record<string, string> = {
  discovery: "Appel decouverte",
  demo: "Demo produit",
  closing: "Appel closing",
  follow_up: "Suivi",
  coaching: "Coaching",
};

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

  // Edit form state
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
      toast.error("Erreur lors de la mise a jour");
      return;
    }
    setCurrentBooking({ ...currentBooking, status });
    toast.success("Statut mis a jour");
  }

  async function handleEditSubmit() {
    setSaving(true);
    const result = await updateBooking(currentBooking.id, editForm);
    setSaving(false);

    if (result.error) {
      toast.error("Erreur lors de la mise a jour");
      return;
    }

    setCurrentBooking({
      ...currentBooking,
      ...editForm,
    });
    setEditOpen(false);
    toast.success("Booking mis a jour");
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
    toast.success("Booking reprogramme");
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
    toast.success("Deal cree avec succes !");
    if (result.deal?.id) {
      router.push(`/crm/${result.deal.id}`);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteBooking(currentBooking.id);
    if (result.error) {
      toast.error("Erreur lors de la suppression");
      setDeleting(false);
      return;
    }
    toast.success("Booking supprime");
    router.push("/bookings");
  }

  return (
    <div>
      <PageHeader
        title={`Booking avec ${currentBooking.prospect_name}`}
        description={format(scheduledDate, "EEEE d MMMM yyyy 'a' HH:mm", { locale: fr })}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/bookings">
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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Modifier le booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="text-sm font-medium">Nom du prospect</label>
                  <Input
                    value={editForm.prospect_name}
                    onChange={(e) => setEditForm({ ...editForm, prospect_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editForm.prospect_email}
                      onChange={(e) => setEditForm({ ...editForm, prospect_email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Telephone</label>
                    <Input
                      value={editForm.prospect_phone}
                      onChange={(e) => setEditForm({ ...editForm, prospect_phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type de RDV</label>
                    <Select
                      value={editForm.slot_type}
                      onValueChange={(v) => setEditForm({ ...editForm, slot_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discovery">Appel decouverte</SelectItem>
                        <SelectItem value="demo">Demo produit</SelectItem>
                        <SelectItem value="closing">Appel closing</SelectItem>
                        <SelectItem value="follow_up">Suivi</SelectItem>
                        <SelectItem value="coaching">Coaching</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duree (min)</label>
                    <Input
                      type="number"
                      value={editForm.duration_minutes}
                      onChange={(e) => setEditForm({ ...editForm, duration_minutes: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Assigne a</label>
                  <Select
                    value={editForm.assigned_to}
                    onValueChange={(v) => setEditForm({ ...editForm, assigned_to: v })}
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
                  <label className="text-sm font-medium">Lien de reunion</label>
                  <Input
                    value={editForm.meeting_link}
                    onChange={(e) => setEditForm({ ...editForm, meeting_link: e.target.value })}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleEditSubmit}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
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
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Reporter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reporter le booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Nouvelle date</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Nouvelle heure</label>
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleReschedule}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
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
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce booking ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irreversible. Le rendez-vous sera definitivement supprime.
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
          {/* Status and date card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${statusInfo.color}`}
                  >
                    <StatusIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isUpcoming
                        ? `Dans ${formatDistanceToNow(scheduledDate, { locale: fr })}`
                        : `Il y a ${formatDistanceToNow(scheduledDate, { locale: fr })}`}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-sm">
                  {slotTypeLabels[currentBooking.slot_type] || currentBooking.slot_type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {format(scheduledDate, "EEEE d MMMM", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Heure</p>
                    <p className="font-medium">{format(scheduledDate, "HH:mm")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duree</p>
                    <p className="font-medium">{currentBooking.duration_minutes} min</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions for status change */}
          {currentBooking.status === "confirmed" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {isPastBooking && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange("completed")}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        disabled={!!statusLoading}
                      >
                        {statusLoading === "completed" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Marquer termine
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange("no_show")}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={!!statusLoading}
                      >
                        {statusLoading === "no_show" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                        No-show
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange("cancelled")}
                    disabled={!!statusLoading}
                  >
                    {statusLoading === "cancelled" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Convert to deal — shown when booking is completed */}
          {currentBooking.status === "completed" && (
            <Card className="border-brand/20 bg-brand/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Booking termine</p>
                  <p className="text-sm text-muted-foreground">Convertir ce prospect en deal dans le CRM</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleConvertToDeal}
                  disabled={convertingToDeal}
                  className="bg-brand text-brand-dark hover:bg-brand/90"
                >
                  {convertingToDeal ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-1" />}
                  {convertingToDeal ? "Conversion..." : "Convertir en deal"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Meeting link */}
          {currentBooking.meeting_link && (
            <Card className="border-brand/20 bg-brand/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-brand" />
                  <span className="font-medium">Lien de reunion</span>
                </div>
                <Button size="sm" asChild className="bg-brand text-brand-dark hover:bg-brand/90">
                  <a href={currentBooking.meeting_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
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
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{currentBooking.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Reliability score */}
          {currentBooking.reliability_score > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Score de fiabilite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20">
                    <svg className="h-20 w-20 -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-muted"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={`${currentBooking.reliability_score * 2.26} 226`}
                        className={
                          currentBooking.reliability_score >= 70
                            ? "text-green-500"
                            : currentBooking.reliability_score >= 40
                              ? "text-yellow-500"
                              : "text-red-500"
                        }
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center font-bold">
                      {currentBooking.reliability_score}%
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentBooking.reliability_score >= 70
                      ? "Prospect tres fiable - haute probabilite de presence"
                      : currentBooking.reliability_score >= 40
                        ? "Fiabilite moyenne - envisagez une confirmation"
                        : "Faible fiabilite - confirmez avant le RDV"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Prospect info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prospect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
                  {(currentBooking.prospect_name || "?").charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{currentBooking.prospect_name || "Prospect"}</p>
                </div>
              </div>

              <Separator />

              {currentBooking.prospect_email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${currentBooking.prospect_email}`}
                    className="text-sm hover:underline"
                  >
                    {currentBooking.prospect_email}
                  </a>
                </div>
              )}

              {currentBooking.prospect_phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
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
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`tel:${currentBooking.prospect_phone}`}>
                      <Phone className="h-4 w-4 mr-1" />
                      Appeler
                    </a>
                  </Button>
                )}
                {currentBooking.prospect_email && (
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={`mailto:${currentBooking.prospect_email}`}>
                      <Mail className="h-4 w-4 mr-1" />
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
                <CardTitle className="text-base">Assigne a</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium">
                    {currentBooking.assigned_user.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium">
                      {currentBooking.assigned_user.full_name}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
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
              <CardTitle className="text-base">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cree le</span>
                <span>
                  {format(new Date(currentBooking.created_at), "d MMM yyyy", {
                    locale: fr,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rappel envoye</span>
                <span>{currentBooking.reminder_sent ? "Oui" : "Non"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
