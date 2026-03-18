"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
import { createClient } from "@/lib/supabase/client";
import { sendBookingConfirmation } from "@/lib/actions/email";
import {
  getAvailableSlots,
  captureBookingLead,
  createPublicBooking,
  trackBookingPageView,
} from "@/lib/actions/booking-pages";
import { toast } from "sonner";
import {
  CheckCircle2,
  Loader2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import type {
  PublicBookingPageData,
  AvailableSlot,
} from "@/lib/types/database";
import { DateSelector } from "./date-selector";
import { TimeSlotPicker } from "./time-slot-picker";
import { QualificationForm } from "./qualification-form";
import { BookingConfirmation } from "./booking-confirmation";

interface BookingFormProps {
  slug: string;
  pageConfig: PublicBookingPageData | null;
}

type Step = "qualify" | "schedule" | "confirmed" | "disqualified";

const DEFAULT_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
];

export function BookingForm({ slug, pageConfig }: BookingFormProps) {
  const [step, setStep] = useState<Step>("qualify");
  const [loading, setLoading] = useState(false);

  // Contact info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Legacy qualification (when no pageConfig)
  const [revenue, setRevenue] = useState("");
  const [challenge, setChallenge] = useState("");
  const [urgency, setUrgency] = useState("");

  // Dynamic qualification (from pageConfig)
  const [qualificationAnswers, setQualificationAnswers] = useState<
    Record<string, string>
  >({});

  // Schedule
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);

  // Track page view on mount
  useEffect(() => {
    trackBookingPageView(slug, document.referrer || undefined);
  }, [slug]);

  // Fetch available slots when date changes
  const fetchSlots = useCallback(
    async (date: string) => {
      setLoadingSlots(true);
      setSelectedTime("");

      if (pageConfig) {
        // Use RPC-based slot fetching
        const { slots } = await getAvailableSlots(slug, date);
        setAvailableSlots(slots);
        setAvailableTimes(slots.map((s) => s.start_time.slice(0, 5)));
      } else {
        // Legacy: fetch from booking_slots
        try {
          const supabase = createClient();
          const dayOfWeek = new Date(date).getDay();
          const { data: slots } = await supabase
            .from("booking_slots")
            .select("start_time, end_time, duration_minutes")
            .eq("day_of_week", dayOfWeek)
            .eq("is_active", true)
            .order("start_time", { ascending: true });

          if (slots && slots.length > 0) {
            const times: string[] = [];
            for (const slot of slots) {
              const [startH, startM] = slot.start_time.split(":").map(Number);
              const [endH, endM] = slot.end_time.split(":").map(Number);
              const duration = slot.duration_minutes || 30;
              let current = startH * 60 + startM;
              const end = endH * 60 + endM;
              while (current + duration <= end) {
                const h = Math.floor(current / 60)
                  .toString()
                  .padStart(2, "0");
                const m = (current % 60).toString().padStart(2, "0");
                times.push(`${h}:${m}`);
                current += duration;
              }
            }
            setAvailableTimes(times.length > 0 ? times : DEFAULT_TIMES);
          } else {
            setAvailableTimes(DEFAULT_TIMES);
          }
        } catch {
          setAvailableTimes(DEFAULT_TIMES);
        }
      }
      setLoadingSlots(false);
    },
    [slug, pageConfig],
  );

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  // Step 1: Qualify
  async function handleQualify(e: React.FormEvent) {
    e.preventDefault();

    if (pageConfig) {
      // Capture lead via RPC
      setLoading(true);
      const { leadId: id, error } = await captureBookingLead({
        pageSlug: slug,
        name,
        email: email || undefined,
        phone: phone || undefined,
        qualification: qualificationAnswers,
      });
      setLoading(false);

      if (error) {
        toast.error(error);
        return;
      }
      setLeadId(id);
      setStep("schedule");
    } else {
      // Legacy qualification logic
      const isQualified = revenue !== "less_1k" && urgency !== "not_urgent";
      if (isQualified) {
        setStep("schedule");
      } else {
        setStep("disqualified");
      }
    }
  }

  // Step 2: Book
  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Sélectionnez une date et un horaire");
      return;
    }

    setLoading(true);

    if (pageConfig && leadId) {
      // Use RPC-based booking
      const { bookingId, error } = await createPublicBooking({
        pageSlug: slug,
        leadId,
        date: selectedDate,
        startTime: selectedTime + ":00",
        name,
        email,
        phone: phone || undefined,
      });

      if (error) {
        toast.error(error);
        setLoading(false);
        return;
      }
    } else {
      // Legacy: direct insert
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
      const supabase = createClient();
      const { error } = await supabase.from("bookings").insert({
        prospect_name: name,
        prospect_email: email,
        prospect_phone: phone,
        scheduled_at: scheduledAt.toISOString(),
        slot_type: "discovery",
        duration_minutes: 30,
        status: "confirmed",
        qualification_data: { revenue, challenge, urgency },
      });

      if (error) {
        toast.error("Erreur lors de la réservation");
        setLoading(false);
        return;
      }
    }

    // Send confirmation email (fire-and-forget)
    if (email) {
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
      sendBookingConfirmation({
        email,
        name,
        date: scheduledAt.toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: pageConfig?.title || "Appel découverte",
      }).catch(() => {});
    }

    setStep("confirmed");
    setLoading(false);
  }

  // ─── Confirmed ──────────────────────────────────────────────────
  if (step === "confirmed") {
    return (
      <BookingConfirmation
        email={email}
        date={selectedDate}
        time={selectedTime}
        pageTitle={pageConfig?.title}
        brandColor={pageConfig?.brand_color}
      />
    );
  }

  // ─── Disqualified ───────────────────────────────────────────────
  if (step === "disqualified") {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-2">Merci pour votre intérêt !</h2>
        <p className="text-muted-foreground mb-4">
          Pour le moment, nos accompagnements ne semblent pas correspondre à
          votre situation. Voici des ressources gratuites pour vous aider :
        </p>
        <Button variant="outline">Accéder aux ressources gratuites</Button>
      </div>
    );
  }

  // ─── Schedule step ──────────────────────────────────────────────
  if (step === "schedule") {
    const maxDays = pageConfig?.max_days_ahead || 60;
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDays);

    return (
      <form onSubmit={handleBook} className="space-y-5">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setStep("qualify")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Choisissez un créneau</h2>
            <p className="text-sm text-muted-foreground">
              {pageConfig
                ? `${pageConfig.slot_duration} min · ${pageConfig.timezone}`
                : "Sélectionnez la date et l'heure qui vous conviennent."}
            </p>
          </div>
        </div>

        <DateSelector
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          maxDate={maxDate.toISOString().split("T")[0]}
        />

        {selectedDate && (
          <TimeSlotPicker
            times={availableTimes}
            selectedTime={selectedTime}
            onSelect={setSelectedTime}
            loading={loadingSlots}
            brandColor={pageConfig?.brand_color}
          />
        )}

        <Button
          type="submit"
          className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
          disabled={loading || !selectedTime}
          style={
            pageConfig?.brand_color
              ? {
                  backgroundColor: pageConfig.brand_color,
                  color: "#1a1a1a",
                }
              : undefined
          }
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmer le rendez-vous
        </Button>
      </form>
    );
  }

  // ─── Qualification step ─────────────────────────────────────────
  return (
    <form onSubmit={handleQualify} className="space-y-4">
      <h2 className="text-xl font-bold mb-2">
        {pageConfig?.title || "Quelques questions rapides"}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Pour mieux préparer notre échange et vous apporter un maximum de valeur.
      </p>

      {/* Contact fields */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom complet</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom"
          required
        />
      </div>

      {pageConfig?.email_visible !== false && (
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vous@example.com"
            required={pageConfig?.email_required !== false}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="06 12 34 56 78"
        />
      </div>

      {/* Dynamic qualification fields (from pageConfig) */}
      {pageConfig?.qualification_fields &&
      pageConfig.qualification_fields.length > 0 ? (
        <QualificationForm
          fields={pageConfig.qualification_fields}
          answers={qualificationAnswers}
          onChange={setQualificationAnswers}
        />
      ) : (
        /* Legacy fields (no pageConfig) */
        <>
          <div className="space-y-2">
            <Label>Chiffre d&apos;affaires actuel</Label>
            <Select value={revenue} onValueChange={setRevenue} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="less_1k">Moins de 1 000 €/mois</SelectItem>
                <SelectItem value="1k_5k">1 000 - 5 000 €/mois</SelectItem>
                <SelectItem value="5k_15k">5 000 - 15 000 €/mois</SelectItem>
                <SelectItem value="15k_plus">15 000+ €/mois</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Principal défi commercial</Label>
            <Textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="Décrivez brièvement votre principal défi..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Urgence</Label>
            <Select value={urgency} onValueChange={setUrgency} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">
                  Je veux commencer maintenant
                </SelectItem>
                <SelectItem value="this_month">Ce mois-ci</SelectItem>
                <SelectItem value="exploring">Je me renseigne</SelectItem>
                <SelectItem value="not_urgent">Pas urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <Button
        type="submit"
        className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
        disabled={loading}
        style={
          pageConfig?.brand_color
            ? { backgroundColor: pageConfig.brand_color, color: "#1a1a1a" }
            : undefined
        }
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continuer
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}
