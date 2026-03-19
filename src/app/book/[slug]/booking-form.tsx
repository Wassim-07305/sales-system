"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Globe,
} from "lucide-react";
import {
  getAvailableSlots,
  captureBookingLead,
  createPublicBooking,
  trackBookingPageView,
} from "@/lib/actions/booking-pages";
import { sendBookingConfirmation } from "@/lib/actions/email";
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

export function BookingForm({ slug, pageConfig }: BookingFormProps) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [qualificationAnswers, setQualificationAnswers] = useState<
    Record<string, string | string[]>
  >({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start_time: string;
    closer_id: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bookingResult, setBookingResult] = useState<{
    start_time: string;
    end_time: string;
  } | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capturingLead, setCapturingLead] = useState(false);

  const brandColor = pageConfig?.brand_color || "#1e3a5f";
  const emailVisible = pageConfig?.email_visible ?? true;
  const emailRequired = pageConfig?.email_required ?? true;

  // Track page view
  useEffect(() => {
    trackBookingPageView(slug, document.referrer || undefined);
  }, [slug]);

  // Fetch slots when date changes
  const fetchSlots = useCallback(
    async (date: string) => {
      setSlotsLoading(true);
      const { slots: fetchedSlots } = await getAvailableSlots(slug, date);
      setSlots(fetchedSlots);
      setSlotsLoading(false);
    },
    [slug],
  );

  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  // Progressive disclosure: show email after phone + name filled
  useEffect(() => {
    if (phone.trim() && firstName.trim() && lastName.trim()) {
      setShowEmail(true);
    }
  }, [phone, firstName, lastName]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "Le prénom est requis";
    if (!lastName.trim()) newErrors.lastName = "Le nom est requis";
    if (emailVisible && emailRequired) {
      if (!email.trim()) newErrors.email = "L'email est requis";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        newErrors.email = "Email invalide";
    } else if (emailVisible && email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        newErrors.email = "Email invalide";
    }

    if (pageConfig?.qualification_fields) {
      for (const field of pageConfig.qualification_fields) {
        if (field.required) {
          const answer = qualificationAnswers[field.id];
          if (
            !answer ||
            (Array.isArray(answer) && answer.length === 0) ||
            (typeof answer === "string" && !answer.trim())
          ) {
            newErrors[field.id] = "Ce champ est requis";
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setCapturingLead(true);
    setErrors({});

    const { leadId: id, error } = await captureBookingLead({
      pageSlug: slug,
      name: `${firstName} ${lastName}`.trim(),
      email: email || undefined,
      phone: phone || undefined,
      qualification: qualificationAnswers,
    });

    setCapturingLead(false);

    if (error) {
      setErrors({
        submit: "Erreur lors de l'enregistrement. Veuillez réessayer.",
      });
      return;
    }

    setLeadId(id);
    setStep(2);
  };

  const handleSelectSlot = async (slot: {
    start_time: string;
    closer_id: string;
  }) => {
    if (!selectedDate || submitting) return;

    setSelectedSlot(slot);
    setErrors({});
    setSubmitting(true);

    const fullName = `${firstName} ${lastName}`.trim();

    const { error } = await createPublicBooking({
      pageSlug: slug,
      leadId: leadId || "",
      date: selectedDate,
      startTime: slot.start_time,
      name: fullName,
      email: email || "",
      phone: phone || undefined,
    });

    if (error) {
      setSelectedSlot(null);
      setSubmitting(false);
      setErrors({
        submit:
          "Ce créneau n'est plus disponible. Veuillez en choisir un autre.",
      });
      return;
    }

    // Send confirmation email (fire-and-forget)
    if (email) {
      const scheduledAt = new Date(`${selectedDate}T${slot.start_time}`);
      sendBookingConfirmation({
        email,
        name: fullName,
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

    // Calculate end time
    const duration = pageConfig?.slot_duration || 30;
    const [h, m] = slot.start_time.split(":").map(Number);
    const endMinutes = h * 60 + m + duration;
    const endTime = `${Math.floor(endMinutes / 60)
      .toString()
      .padStart(2, "0")}:${(endMinutes % 60).toString().padStart(2, "0")}`;

    setBookingResult({
      start_time: slot.start_time.slice(0, 5),
      end_time: endTime,
    });
    setSubmitting(false);
  };

  // Not found
  if (!pageConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <CalendarCheck className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h1 className="text-xl font-bold text-gray-900">Page introuvable</h1>
          <p className="mt-2 text-gray-500">
            Ce lien de réservation n&apos;existe pas ou n&apos;est plus actif.
          </p>
        </div>
      </div>
    );
  }

  // Confirmation
  if (bookingResult) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-12">
        <BookingConfirmation
          prospectName={`${firstName} ${lastName}`.trim()}
          prospectEmail={email || undefined}
          date={selectedDate!}
          startTime={bookingResult.start_time}
          endTime={bookingResult.end_time}
          brandColor={brandColor}
          clientName={pageConfig.created_by_name || undefined}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        {/* Main card */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-8 border-b border-gray-100 py-4">
            <button
              type="button"
              onClick={() => step === 2 && setStep(1)}
              className="flex items-center gap-2"
            >
              {step > 1 ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100">
                  <Check className="h-3 w-3 text-gray-500" />
                </div>
              ) : (
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: brandColor }}
                />
              )}
              <span
                className={`text-sm ${step === 1 ? "font-semibold text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
              >
                Remplir le formulaire
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div
                className={`h-2.5 w-2.5 rounded-full ${step < 2 ? "bg-gray-300" : ""}`}
                style={step >= 2 ? { backgroundColor: brandColor } : undefined}
              />
              <span
                className={`text-sm ${step === 2 ? "font-semibold text-gray-900" : "text-gray-400"}`}
              >
                Réservez votre événement
              </span>
            </div>
          </div>

          {/* ===== STEP 1: Form + Calendar ===== */}
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left: Form */}
              <div className="p-6 md:p-8">
                <h2 className="text-lg font-bold text-gray-900">
                  {pageConfig.created_by_name || pageConfig.title}
                </h2>
                {pageConfig.description && (
                  <p className="mt-1 mb-6 whitespace-pre-line text-sm leading-relaxed text-gray-500">
                    {pageConfig.description}
                  </p>
                )}
                {!pageConfig.description && <div className="mb-6" />}

                <div className="space-y-4">
                  {/* Phone with French flag */}
                  <div className="flex overflow-hidden rounded-lg border border-gray-300 transition-colors focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                    <div className="flex items-center gap-1.5 border-r border-gray-300 bg-gray-50 px-3">
                      <span className="text-base">&#x1F1EB;&#x1F1F7;</span>
                      <span className="text-[10px] text-gray-400">&#9660;</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+33"
                      className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  {/* First name + Last name side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Prénom *"
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                          errors.firstName
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.firstName}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Nom de famille *"
                        className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                          errors.lastName ? "border-red-300" : "border-gray-300"
                        }`}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-500">
                          {errors.lastName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email - progressive reveal */}
                  {showEmail && (
                    <>
                      {emailVisible && (
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Adresse e-mail{" "}
                            {emailRequired && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={
                              emailRequired
                                ? "Adresse email *"
                                : "Adresse email (optionnel)"
                            }
                            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                              errors.email
                                ? "border-red-300"
                                : "border-gray-300"
                            }`}
                          />
                          {errors.email && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.email}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Qualification fields */}
                      {pageConfig.qualification_fields &&
                        pageConfig.qualification_fields.length > 0 && (
                          <QualificationForm
                            fields={pageConfig.qualification_fields}
                            answers={qualificationAnswers}
                            onChange={setQualificationAnswers}
                            errors={errors}
                          />
                        )}
                    </>
                  )}
                </div>

                {/* Privacy notice */}
                <p className="mt-5 text-xs leading-relaxed text-gray-400">
                  En saisissant vos informations, vous acceptez que vos données
                  soient enregistrées conformément à notre{" "}
                  <span className="underline">
                    politique de confidentialité
                  </span>
                  .
                </p>

                {/* Continue button */}
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={capturingLead}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: brandColor }}
                >
                  {capturingLead ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      Continuer
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {errors.submit && (
                  <p className="mt-3 text-center text-sm text-red-500">
                    {errors.submit}
                  </p>
                )}
              </div>

              {/* Right: Calendar (disabled with overlay) */}
              <div className="hidden border-l border-gray-100 p-6 md:block md:p-8">
                <DateSelector
                  selectedDate={null}
                  onSelect={() => {}}
                  maxDaysAhead={pageConfig.max_days_ahead}
                  brandColor={brandColor}
                  disabled
                  disabledMessage="Merci de remplir le formulaire avant de choisir votre créneau horaire."
                />
              </div>
            </div>
          )}

          {/* ===== STEP 2: Info + Calendar + Slots ===== */}
          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_250px]">
              {/* Left: Meeting info */}
              <div className="border-b border-gray-100 p-6 md:border-b-0 md:border-r">
                <h2 className="mb-4 text-lg font-bold text-gray-900">
                  {pageConfig.created_by_name || pageConfig.title}
                </h2>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>{pageConfig.slot_duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>France Time</span>
                  </div>
                </div>
              </div>

              {/* Center: Calendar */}
              <div className="border-b border-gray-100 p-6 md:border-b-0 md:border-r">
                <DateSelector
                  selectedDate={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                    setErrors({});
                  }}
                  maxDaysAhead={pageConfig.max_days_ahead}
                  brandColor={brandColor}
                />
              </div>

              {/* Right: Time slots */}
              <div className="p-6">
                {selectedDate ? (
                  <TimeSlotPicker
                    slots={slots}
                    selectedSlot={selectedSlot}
                    onSelect={handleSelectSlot}
                    isLoading={slotsLoading}
                    submitting={submitting}
                    brandColor={brandColor}
                    selectedDate={selectedDate}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center py-12">
                    <p className="text-center text-sm text-gray-400">
                      Sélectionnez une date
                    </p>
                  </div>
                )}

                {errors.submit && (
                  <p className="mt-3 text-center text-sm text-red-500">
                    {errors.submit}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Powered by{" "}
          <span className="font-semibold text-gray-500">SalesSystem</span>
        </p>
      </div>
    </div>
  );
}
