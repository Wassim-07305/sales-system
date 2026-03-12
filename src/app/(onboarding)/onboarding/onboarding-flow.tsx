"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { completeSimpleOnboarding } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Camera,
  User,
  Phone,
  FileText,
  Target,
  Link2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingFlowProps {
  role: string;
  userId: string;
  userName?: string;
}

interface StepDef {
  id: string;
  type:
    | "welcome"
    | "avatar"
    | "text"
    | "textarea"
    | "chips"
    | "social"
    | "summary";
  title: string;
  subtitle?: string;
}

// ---------------------------------------------------------------------------
// Steps config
// ---------------------------------------------------------------------------

const B2C_STEPS: StepDef[] = [
  { id: "welcome", type: "welcome", title: "Bienvenue sur Sales System" },
  {
    id: "avatar",
    type: "avatar",
    title: "Ta photo de profil",
    subtitle: "Ajoute une photo pour personnaliser ton compte",
  },
  {
    id: "identity",
    type: "text",
    title: "Comment tu t'appelles ?",
    subtitle: "Ton prenom et nom complet",
  },
  {
    id: "phone",
    type: "text",
    title: "Ton numero de telephone",
    subtitle: "Pour qu'on puisse te contacter",
  },
  {
    id: "bio",
    type: "textarea",
    title: "Presente-toi en quelques mots",
    subtitle: "Ta bio courte (max 200 caracteres)",
  },
  {
    id: "skills",
    type: "text",
    title: "Tes competences",
    subtitle: "Separe-les par des virgules",
  },
  { id: "summary", type: "summary", title: "Ton profil est pret !" },
];

const B2B_STEPS: StepDef[] = [
  { id: "welcome", type: "welcome", title: "Bienvenue sur Sales System" },
  {
    id: "avatar",
    type: "avatar",
    title: "Ta photo de profil",
    subtitle: "L'identite visuelle de ton entreprise",
  },
  {
    id: "company",
    type: "text",
    title: "Le nom de ton entreprise",
    subtitle: "Comment s'appelle ton business ?",
  },
  {
    id: "business",
    type: "textarea",
    title: "Decris ton activite",
    subtitle: "Ton offre, ton marche cible, ce que tu fais exactement",
  },
  {
    id: "qualification",
    type: "textarea",
    title: "Tes questions de qualification",
    subtitle: "Quelles questions poses-tu pour qualifier un prospect ?",
  },
  {
    id: "channels",
    type: "chips",
    title: "Tes canaux de prospection",
    subtitle: "Selectionne ceux que tu utilises",
  },
  {
    id: "social",
    type: "social",
    title: "Tes reseaux sociaux",
    subtitle: "LinkedIn et Instagram pour le setting IA",
  },
  { id: "summary", type: "summary", title: "Ton profil est pret !" },
];

const CHANNELS = [
  "LinkedIn",
  "Instagram",
  "Email",
  "Telephone",
  "Reseaux",
  "Bouche a oreille",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingFlow({
  role,
  userId,
  userName,
}: OnboardingFlowProps) {
  const router = useRouter();
  const steps = role === "client_b2b" ? B2B_STEPS : B2C_STEPS;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [completing, setCompleting] = useState(false);

  // Form state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState(userName || "");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [qualificationQ, setQualificationQ] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStep = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const totalReal = steps.length - 2; // exclude welcome + summary
  const currentReal = Math.max(0, Math.min(step - 1, totalReal));
  const progress = totalReal > 0 ? (currentReal / totalReal) * 100 : 0;

  // Auto-focus inputs on step change
  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timeout);
  }, [step]);

  const goNext = useCallback(() => {
    if (step >= steps.length - 1) return;
    setDirection(1);
    setStep((s) => s + 1);
  }, [step, steps.length]);

  const goPrev = useCallback(() => {
    if (step <= 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "TEXTAREA") return;
        e.preventDefault();
        if (isLast) {
          handleComplete();
        } else if (currentStep.type !== "welcome") {
          goNext();
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLast, goNext]);

  async function handleAvatarUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas depasser 5 Mo");
      return;
    }
    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      setAvatarUrl(urlData.publicUrl);
      setAvatarPreview(URL.createObjectURL(file));
      toast.success("Photo uploadee !");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel],
    );
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const result = await completeSimpleOnboarding({
        full_name: fullName || undefined,
        phone: phone || undefined,
        company: company || undefined,
        avatar_url: avatarUrl || undefined,
        bio: bio || undefined,
        skills: skills || undefined,
        business_description: businessDesc || undefined,
        qualification_questions: qualificationQ || undefined,
        prospection_channels: channels.length > 0 ? channels : undefined,
        linkedin_url: linkedinUrl || undefined,
        instagram_username: instagramUsername || undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        setCompleting(false);
        return;
      }
      // Dynamic confetti import
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ["#7af17a", "#4ade80", "#22c55e", "#16a34a", "#ffffff"],
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch {
      toast.error("Une erreur est survenue");
      setCompleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Step renderers
  // ---------------------------------------------------------------------------

  function renderWelcome() {
    const displayName =
      userName || (role === "client_b2b" ? "partenaire" : "setter");
    return (
      <div className="flex flex-col items-center text-center gap-8">
        {/* Animated logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#7af17a]/20 to-[#7af17a]/5 border border-[#7af17a]/30 flex items-center justify-center shadow-lg shadow-[#7af17a]/10">
            <Image src="/logo.png" alt="Sales System" width={56} height={56} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Bienvenue{userName ? "," : ""}{" "}
            <span className="text-[#7af17a]">{displayName}</span>
          </h1>
          <p className="text-white/40 text-lg max-w-md">
            {role === "client_b2b"
              ? "Quelques questions pour configurer ton espace business et activer le setting IA."
              : "Quelques etapes pour configurer ton profil et demarrer ta formation."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.3 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10"
        >
          <Sparkles className="h-4 w-4 text-[#7af17a]" />
          <span className="text-sm text-white/50">
            {role === "client_b2b" ? "5 etapes" : "3 etapes"} — moins de 2
            minutes
          </span>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          onClick={goNext}
          className="mt-4 px-8 py-4 bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-105 transition-all duration-200"
        >
          C&apos;est parti
        </motion.button>
      </div>
    );
  }

  function renderAvatar() {
    return (
      <div className="flex flex-col items-center gap-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-white/20 hover:border-[#7af17a]/60 transition-all duration-300 bg-white/5 flex items-center justify-center"
        >
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarPreview}
              alt="Apercu"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="h-10 w-10 text-white/30 group-hover:text-[#7af17a] transition-colors" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploadingAvatar ? (
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </div>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleAvatarUpload(file);
          }}
        />
        <p className="text-sm text-white/40">
          Clique pour choisir une photo (max 5 Mo)
        </p>
      </div>
    );
  }

  function renderTextInput() {
    const id = currentStep.id;
    const value =
      id === "identity"
        ? fullName
        : id === "phone"
          ? phone
          : id === "company"
            ? company
            : id === "skills"
              ? skills
              : "";
    const setValue =
      id === "identity"
        ? setFullName
        : id === "phone"
          ? setPhone
          : id === "company"
            ? setCompany
            : id === "skills"
              ? setSkills
              : setFullName;
    const placeholder =
      id === "identity"
        ? "Jean Dupont"
        : id === "phone"
          ? "+33 6 12 34 56 78"
          : id === "company"
            ? "AgenceX, SaaS Corp..."
            : id === "skills"
              ? "Cold calling, LinkedIn, closing..."
              : "";
    const type = id === "phone" ? "tel" : "text";

    return (
      <div className="w-full max-w-md mx-auto">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-2xl sm:text-3xl font-medium text-white placeholder:text-white/20 border-b-2 border-white/20 focus:border-[#7af17a] outline-none pb-3 transition-colors duration-200"
        />
      </div>
    );
  }

  function renderTextarea() {
    const id = currentStep.id;
    const value =
      id === "bio"
        ? bio
        : id === "business"
          ? businessDesc
          : id === "qualification"
            ? qualificationQ
            : "";
    const setValue =
      id === "bio"
        ? setBio
        : id === "business"
          ? setBusinessDesc
          : id === "qualification"
            ? setQualificationQ
            : setBio;
    const placeholder =
      id === "bio"
        ? "Parle-nous de toi en quelques mots..."
        : id === "business"
          ? "Decris ton activite, ton offre, ton marche cible..."
          : id === "qualification"
            ? "Ex :\n- Quel est ton budget ?\n- Depuis combien de temps cherches-tu une solution ?"
            : "";
    const maxLen = id === "bio" ? 200 : undefined;

    return (
      <div className="w-full max-w-md mx-auto space-y-2">
        <textarea
          value={value}
          onChange={(e) =>
            setValue(maxLen ? e.target.value.slice(0, maxLen) : e.target.value)
          }
          placeholder={placeholder}
          rows={id === "bio" ? 3 : 5}
          className="w-full bg-white/5 text-lg text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-4 resize-none transition-colors duration-200"
        />
        {maxLen && (
          <p className="text-xs text-white/30 text-right">
            {value.length}/{maxLen}
          </p>
        )}
      </div>
    );
  }

  function renderChips() {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {CHANNELS.map((channel) => {
            const selected = channels.includes(channel);
            return (
              <button
                key={channel}
                type="button"
                onClick={() => toggleChannel(channel)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200",
                  selected
                    ? "border-[#7af17a]/60 bg-[#7af17a]/10 text-[#7af17a] shadow-sm shadow-[#7af17a]/10"
                    : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70",
                )}
              >
                {selected ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-current shrink-0" />
                )}
                {channel}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSocial() {
    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="space-y-2">
          <label className="text-sm text-white/50">URL LinkedIn</label>
          <input
            ref={inputRef}
            type="url"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            placeholder="https://linkedin.com/in/ton-profil"
            className="w-full bg-white/5 text-lg text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-4 transition-colors duration-200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-white/50">Username Instagram</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">
              @
            </span>
            <input
              type="text"
              value={instagramUsername}
              onChange={(e) =>
                setInstagramUsername(e.target.value.replace(/^@/, ""))
              }
              placeholder="ton_username"
              className="w-full bg-white/5 text-lg text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-4 pl-9 transition-colors duration-200"
            />
          </div>
        </div>
      </div>
    );
  }

  function renderSummary() {
    const items =
      role === "client_b2b"
        ? [
            {
              icon: User,
              label: "Photo",
              value: avatarPreview ? "Uploadee" : "Non definie",
            },
            {
              icon: FileText,
              label: "Entreprise",
              value: company || "Non defini",
            },
            {
              icon: FileText,
              label: "Business",
              value: businessDesc
                ? businessDesc.slice(0, 50) + "..."
                : "Non defini",
            },
            {
              icon: Target,
              label: "Canaux",
              value: channels.length > 0 ? channels.join(", ") : "Aucun",
            },
            {
              icon: Link2,
              label: "LinkedIn",
              value: linkedinUrl || "Non defini",
            },
          ]
        : [
            {
              icon: User,
              label: "Photo",
              value: avatarPreview ? "Uploadee" : "Non definie",
            },
            { icon: User, label: "Nom", value: fullName || "Non defini" },
            { icon: Phone, label: "Telephone", value: phone || "Non defini" },
            {
              icon: FileText,
              label: "Bio",
              value: bio ? bio.slice(0, 50) + "..." : "Non definie",
            },
            {
              icon: Target,
              label: "Competences",
              value: skills || "Non defini",
            },
          ];

    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        <div className="space-y-3">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="w-8 h-8 rounded-lg bg-[#7af17a]/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-[#7af17a]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/40">{item.label}</p>
                  <p className="text-sm text-white truncate">{item.value}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={handleComplete}
          disabled={completing}
          className="w-full py-4 bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {completing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Terminer et acceder au dashboard
            </>
          )}
        </motion.button>
      </div>
    );
  }

  function renderStepContent() {
    switch (currentStep.type) {
      case "welcome":
        return renderWelcome();
      case "avatar":
        return renderAvatar();
      case "text":
        return renderTextInput();
      case "textarea":
        return renderTextarea();
      case "chips":
        return renderChips();
      case "social":
        return renderSocial();
      case "summary":
        return renderSummary();
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-[#7af17a]/[0.04] blur-3xl animate-pulse" />
        <div
          className="absolute -top-12 -right-12 w-80 h-80 rounded-full bg-[#4ade80]/[0.03] blur-3xl animate-pulse"
          style={{ animationDuration: "4s", animationDelay: "1s" }}
        />
        <div
          className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full bg-[#7af17a]/[0.03] blur-3xl animate-pulse"
          style={{ animationDuration: "5s", animationDelay: "2s" }}
        />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.01'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Progress bar — fixed top */}
      {currentStep.type !== "welcome" && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-[#7af17a] to-[#4ade80]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Top bar */}
      {currentStep.type !== "welcome" && (
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 pt-6">
          {/* Back button */}
          <button
            onClick={goPrev}
            className={cn(
              "h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all",
              step <= 1 && "opacity-0 pointer-events-none",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Sales System" width={24} height={24} />
            <span className="text-sm font-semibold text-white/60 hidden sm:block">
              Sales System
            </span>
          </div>

          {/* Step counter */}
          <span className="text-sm text-white/40 font-medium tabular-nums">
            {currentReal}/{totalReal}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ y: direction > 0 ? 40 : -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: direction > 0 ? -40 : 40, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-2xl"
          >
            {/* Step title (not on welcome/summary) */}
            {currentStep.type !== "welcome" &&
              currentStep.type !== "summary" && (
                <div className="text-center mb-10">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {currentStep.title}
                  </h2>
                  {currentStep.subtitle && (
                    <p className="text-white/40 mt-2 text-base">
                      {currentStep.subtitle}
                    </p>
                  )}
                </div>
              )}

            {/* Summary title */}
            {currentStep.type === "summary" && (
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 rounded-full bg-[#7af17a]/20 border border-[#7af17a]/30 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-[#7af17a]" />
                </motion.div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {currentStep.title}
                </h2>
                <p className="text-white/40 mt-2">
                  Voici un resume de ton profil
                </p>
              </div>
            )}

            {/* Step content */}
            <div className="flex flex-col items-center">
              {renderStepContent()}
            </div>

            {/* OK / Continue button (not on welcome/summary) */}
            {currentStep.type !== "welcome" &&
              currentStep.type !== "summary" && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={goNext}
                    className="group flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-sm font-medium"
                  >
                    OK
                    <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/40 group-hover:text-white/60 transition-colors">
                      Entree
                    </span>
                  </button>
                </div>
              )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="fixed bottom-6 left-0 right-0 z-40 text-center">
        <p className="text-xs text-white/20">
          Tu pourras modifier ces informations dans tes parametres
        </p>
      </div>
    </div>
  );
}
