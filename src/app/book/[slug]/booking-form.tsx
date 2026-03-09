"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { CheckCircle2, Loader2, Calendar, Clock, ArrowRight } from "lucide-react";

interface BookingFormProps {
  slug: string;
}

type Step = "qualify" | "schedule" | "confirmed" | "disqualified";

export function BookingForm({ slug }: BookingFormProps) {
  const [step, setStep] = useState<Step>("qualify");
  const [loading, setLoading] = useState(false);

  // Qualification data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [revenue, setRevenue] = useState("");
  const [challenge, setChallenge] = useState("");
  const [urgency, setUrgency] = useState("");

  // Schedule data
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Simple qualification logic
  function handleQualify(e: React.FormEvent) {
    e.preventDefault();

    const isQualified =
      revenue !== "less_1k" && urgency !== "not_urgent";

    if (isQualified) {
      setStep("schedule");
    } else {
      setStep("disqualified");
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime) {
      toast.error("Sélectionnez une date et un horaire");
      return;
    }

    setLoading(true);

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);

    const supabase = createClient();
    const { error } = await supabase.from("bookings").insert({
      prospect_name: name,
      prospect_email: email,
      prospect_phone: phone,
      scheduled_at: scheduledAt.toISOString(),
      slot_type: "discovery",
      qualification_data: { revenue, challenge, urgency },
    });

    if (error) {
      toast.error("Erreur lors de la réservation");
      setLoading(false);
      return;
    }

    // Send confirmation email (fire-and-forget)
    if (email) {
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
        type: "Appel decouverte",
      }).catch(() => {});
    }

    setStep("confirmed");
    setLoading(false);
  }

  // Available times (mock - would come from booking_slots in production)
  const availableTimes = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "14:00",
    "14:30", "15:00", "15:30", "16:00", "16:30",
  ];

  if (step === "confirmed") {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-brand" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Rendez-vous confirmé !</h2>
        <p className="text-muted-foreground mb-4">
          Un email de confirmation a été envoyé à <strong>{email}</strong>
        </p>
        <div className="bg-muted/50 rounded-lg p-4 inline-block">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-brand" />
            <span>{selectedDate}</span>
            <Clock className="h-4 w-4 text-brand ml-2" />
            <span>{selectedTime}</span>
          </div>
        </div>
      </div>
    );
  }

  if (step === "disqualified") {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-2">
          Merci pour votre intérêt !
        </h2>
        <p className="text-muted-foreground mb-4">
          Pour le moment, nos accompagnements ne semblent pas correspondre à votre situation.
          Voici des ressources gratuites pour vous aider :
        </p>
        <Button variant="outline">
          Accéder aux ressources gratuites
        </Button>
      </div>
    );
  }

  if (step === "schedule") {
    return (
      <form onSubmit={handleBook} className="space-y-4">
        <h2 className="text-xl font-bold mb-2">Choisissez un créneau</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Sélectionnez la date et l&apos;heure qui vous conviennent.
        </p>

        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Horaire</Label>
          <div className="grid grid-cols-3 gap-2">
            {availableTimes.map((time) => (
              <Button
                key={time}
                type="button"
                variant={selectedTime === time ? "default" : "outline"}
                size="sm"
                className={
                  selectedTime === time
                    ? "bg-brand text-brand-dark hover:bg-brand/90"
                    : ""
                }
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
          disabled={loading}
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmer le rendez-vous
        </Button>
      </form>
    );
  }

  // Qualification step
  return (
    <form onSubmit={handleQualify} className="space-y-4">
      <h2 className="text-xl font-bold mb-2">Quelques questions rapides</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Pour mieux préparer notre échange et vous apporter un maximum de valeur.
      </p>

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

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@example.com"
          required
        />
      </div>

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
            <SelectItem value="now">Je veux commencer maintenant</SelectItem>
            <SelectItem value="this_month">Ce mois-ci</SelectItem>
            <SelectItem value="exploring">Je me renseigne</SelectItem>
            <SelectItem value="not_urgent">Pas urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
      >
        Continuer
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </form>
  );
}
