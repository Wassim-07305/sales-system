"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  completeSimpleOnboarding,
  generateB2BWorkspace,
  uploadAvatar,
  getWelcomeVideo,
  saveOnboardingProgress,
  postWelcomeCommunityMessage,
} from "@/lib/actions/onboarding";
import { WelcomeVideo } from "@/components/welcome-video";
import { SignatureDialog } from "@/components/signature-dialog";
import { ensureAcademyContract } from "@/lib/actions/contracts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Loader2,
  Camera,
  User,
  Phone,
  FileText,
  FileSignature,
  Target,
  Link2,
  CheckCircle2,
  Sparkles,
  Play,
  Users,
  Lock,
  Trophy,
} from "lucide-react";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OnboardingFlowProps {
  role: string;
  userId: string;
  userName?: string;
  savedStep?: number;
}

interface StepDef {
  id: string;
  type:
    | "video"
    | "b2c_welcome"
    | "b2c_profile"
    | "b2c_video"
    | "b2c_community"
    | "b2c_contract"
    | "welcome"
    | "avatar"
    | "text"
    | "textarea"
    | "chips"
    | "social"
    | "setter_profile"
    | "summary"
    | "b2b_questionnaire"
    | "b2b_confirmation";
  title: string;
  subtitle?: string;
}

// ---------------------------------------------------------------------------
// Steps config
// ---------------------------------------------------------------------------

const B2C_STEPS: StepDef[] = [
  {
    id: "b2c_welcome",
    type: "b2c_welcome",
    title: "Bienvenue dans la S Academy",
    subtitle: "Damien Reynaud te souhaite la bienvenue",
  },
  {
    id: "b2c_profile",
    type: "b2c_profile",
    title: "Ton profil",
    subtitle: "Quelques infos pour personnaliser ton parcours",
  },
  {
    id: "b2c_video",
    type: "b2c_video",
    title: "Vidéo de présentation",
    subtitle: "Regarde cette vidéo pour découvrir la méthode",
  },
  {
    id: "b2c_community",
    type: "b2c_community",
    title: "Rejoins la communauté",
    subtitle: "Présente-toi aux autres membres",
  },
  {
    id: "b2c_contract",
    type: "b2c_contract" as StepDef["type"],
    title: "Ton contrat d'accompagnement",
    subtitle: "Lis et signe ton contrat pour accéder à la plateforme",
  },
];

const B2B_STEPS: StepDef[] = [
  {
    id: "b2b_welcome",
    type: "b2c_welcome",
    title: "Bienvenue sur Sales System",
    subtitle: "Ton espace entrepreneur est prêt à être configuré",
  },
  {
    id: "b2b_questionnaire",
    type: "b2b_questionnaire",
    title: "Ton business",
    subtitle: "Dis-nous en plus sur ton activité pour configurer ton espace",
  },
  {
    id: "b2b_confirmation",
    type: "b2b_confirmation",
    title: "Ton espace est prêt !",
    subtitle: "Récapitulatif et création de ton workspace",
  },
];

const CHANNELS = [
  "LinkedIn",
  "Instagram",
  "Email",
  "Téléphone",
  "Réseaux",
  "Bouche à oreille",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OnboardingFlow({
  role,
  userId,
  userName,
  savedStep,
}: OnboardingFlowProps) {
  const router = useRouter();
  const steps = role === "client_b2b" ? B2B_STEPS : B2C_STEPS;
  const [step, setStep] = useState(savedStep || 0);
  const [direction, setDirection] = useState(1);
  const [completing, setCompleting] = useState(false);

  // B2C step completion gating
  const [stepCompleted, setStepCompleted] = useState<Record<string, boolean>>(
    {},
  );

  // Form state — B2C
  const [objectifPrincipal, setObjectifPrincipal] = useState("");
  const [whyMotivation, setWhyMotivation] = useState("");
  const [disponibilitesHeures, setDisponibilitesHeures] = useState("4");
  const [niveauExperience, setNiveauExperience] = useState("");
  const [videoWatchSeconds, setVideoWatchSeconds] = useState(0);
  const [videoUnlocked, setVideoUnlocked] = useState(false);
  const [communityJoined, setCommunityJoined] = useState(false);
  const [contractSigned, setContractSigned] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signingContract, setSigningContract] = useState(false);
  const [academyContractId, setAcademyContractId] = useState<string | null>(
    null,
  );
  const [joiningCommunity, setJoiningCommunity] = useState(false);

  // Form state — B2B
  const [company, setCompany] = useState("");
  const [secteur, setSecteur] = useState("");
  const [offre, setOffre] = useState("");
  const [cible, setCible] = useState("");
  const [caMensuel, setCaMensuel] = useState("");
  const [plateforme, setPlateforme] = useState<string[]>([]);
  const [objectifB2B, setObjectifB2B] = useState("");

  // Shared state
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState(userName || "");
  const [phone, setPhone] = useState("");
  const [welcomeVideoData, setWelcomeVideoData] = useState<{
    videoUrl: string;
    title: string;
    description: string | null;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = steps.length > 1 ? (step / (steps.length - 1)) * 100 : 0;

  // Fetch welcome video data on mount
  useEffect(() => {
    getWelcomeVideo(role).then((data) => {
      if (data) setWelcomeVideoData(data);
    });
  }, [role]);

  // Auto-focus inputs on step change
  useEffect(() => {
    const timeout = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(timeout);
  }, [step]);

  // Video unlock timer for B2C step 3
  useEffect(() => {
    if (currentStep?.type === "b2c_video" && !videoUnlocked) {
      videoTimerRef.current = setInterval(() => {
        setVideoWatchSeconds((prev) => {
          const next = prev + 1;
          if (next >= 30) {
            setVideoUnlocked(true);
            if (videoTimerRef.current) clearInterval(videoTimerRef.current);
          }
          return next;
        });
      }, 1000);
      return () => {
        if (videoTimerRef.current) clearInterval(videoTimerRef.current);
      };
    }
  }, [currentStep?.type, videoUnlocked]);

  // Ensure academy contract exists when reaching the contract step
  useEffect(() => {
    if (currentStep?.type === "b2c_contract" && !academyContractId) {
      ensureAcademyContract(userId).then(async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("contracts")
          .select("id")
          .eq("client_id", userId)
          .ilike("content", "%CONTRAT D'ACCOMPAGNEMENT%")
          .neq("status", "expired")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setAcademyContractId(data.id);
      });
    }
  }, [currentStep?.type, academyContractId, userId]);

  // Check if current step can proceed (sequential gating)
  const canProceed = useCallback(() => {
    const stepId = currentStep?.id;
    if (!stepId) return false;

    if (role === "client_b2c") {
      switch (stepId) {
        case "b2c_welcome":
          return true;
        case "b2c_profile":
          return !!objectifPrincipal && !!niveauExperience;
        case "b2c_video":
          return videoUnlocked;
        case "b2c_community":
          return communityJoined;
        case "b2c_contract":
          return contractSigned;
        default:
          return true;
      }
    }

    if (role === "client_b2b") {
      switch (stepId) {
        case "b2b_welcome":
          return true;
        case "b2b_questionnaire":
          return (
            !!company &&
            !!secteur &&
            !!offre &&
            !!cible &&
            !!caMensuel &&
            plateforme.length > 0
          );
        default:
          return true;
      }
    }

    return true;
  }, [
    role,
    currentStep,
    objectifPrincipal,
    niveauExperience,
    videoUnlocked,
    communityJoined,
    contractSigned,
    company,
    secteur,
    offre,
    cible,
    caMensuel,
    plateforme,
  ]);

  const goNext = useCallback(async () => {
    if (step >= steps.length - 1) return;
    if (!canProceed()) {
      toast.error("Complète cette étape avant de continuer");
      return;
    }
    // Save progress
    try {
      await saveOnboardingProgress(step + 1);
    } catch {
      // Non-blocking
    }
    setStepCompleted((prev) => ({ ...prev, [currentStep.id]: true }));
    setDirection(1);
    setStep((s) => s + 1);
  }, [step, steps.length, role, canProceed, currentStep]);

  const goPrev = useCallback(() => {
    if (step <= 0) return;
    setDirection(-1);
    setStep((s) => s - 1);
  }, [step]);

  // Keyboard navigation — disabled for B2C (sequential gating)
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (isLast) {
          handleComplete();
        } else if (canProceed()) {
          goNext();
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isLast, goNext, canProceed]);

  async function handleAvatarUpload(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo");
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAvatar(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAvatarUrl(result.url || "");
      setAvatarPreview(URL.createObjectURL(file));
      toast.success("Photo chargée !");
    } catch {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const result = await completeSimpleOnboarding({
        full_name: fullName || undefined,
        phone: phone || undefined,
        company: company || undefined,
        avatar_url: avatarUrl || undefined,
        objectif_financier: objectifPrincipal || undefined,
        disponibilites_heures: disponibilitesHeures || undefined,
        situation_actuelle: niveauExperience || undefined,
        // B2B fields
        business_description: offre || undefined,
        qualification_questions: cible || undefined,
        prospection_channels: plateforme.length > 0 ? plateforme : undefined,
      });
      if (result?.error) {
        toast.error(result.error);
        setCompleting(false);
        return;
      }

      // Generate B2B workspace with SOPs and pipeline
      if (role === "client_b2b") {
        const wsResult = await generateB2BWorkspace({
          companyName: company,
          offer: offre,
          targetAudience: cible,
          price: caMensuel,
          networks: plateforme,
          communicationTone: "professionnel",
        });
        if (wsResult?.error) {
          console.error("Workspace generation error:", wsResult.error);
          // Non-blocking — onboarding still completes
        }
      }
      // Only fire confetti if not already fired (contract signing)
      if (!contractSigned) {
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ["#7af17a", "#4ade80", "#22c55e", "#16a34a", "#ffffff"],
        });
      }
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch {
      toast.error("Une erreur est survenue");
      setCompleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Step renderers — B2C
  // ---------------------------------------------------------------------------

  function renderB2CWelcome() {
    const displayName = userName || "futur setter";
    return (
      <div className="flex flex-col items-center text-center gap-8">
        {/* Damien's photo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            delay: 0.2,
          }}
        >
          <div className="w-28 h-28 rounded-full overflow-hidden border-3 border-[#7af17a]/40 shadow-xl shadow-[#7af17a]/20">
            <Image
              src="/images/damien-reynaud.jpg"
              alt="Damien Reynaud"
              width={112}
              height={112}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image not found
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Bienvenue{userName ? "," : ""}{" "}
            <span className="text-[#7af17a]">{displayName}</span> !
          </h1>
          <p className="text-white/50 text-lg max-w-md leading-relaxed">
            Je suis{" "}
            <span className="text-white font-medium">Damien Reynaud</span>,
            fondateur de la S Academy. Tu es au bon endroit pour transformer ta
            carrière dans le setting.
          </p>
          <p className="text-white/40 text-base max-w-md">
            5 étapes rapides et tu seras prêt à démarrer. On y va ?
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
            5 étapes — quelques minutes
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

  function renderB2CProfile() {
    const OBJECTIFS = [
      { value: "complement", label: "Complément de revenu" },
      {
        value: "activite_principale",
        label: "En faire mon activité principale",
      },
      { value: "remplacer_emploi", label: "Remplacer mon emploi actuel" },
    ];
    const NIVEAUX = [
      { value: "debutant", label: "Débutant — Je découvre le setting" },
      {
        value: "intermediaire",
        label: "Intermédiaire — J'ai déjà quelques expériences",
      },
      {
        value: "avance",
        label: "Avancé — Je suis déjà actif en setting/closing",
      },
    ];

    return (
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Objectif principal */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/60">
            Quel est ton objectif principal ?
          </label>
          <div className="space-y-2">
            {OBJECTIFS.map((obj) => (
              <button
                key={obj.value}
                type="button"
                onClick={() => setObjectifPrincipal(obj.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-200",
                  objectifPrincipal === obj.value
                    ? "border-[#7af17a]/60 bg-[#7af17a]/10 text-white shadow-sm shadow-[#7af17a]/10"
                    : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70",
                )}
              >
                <span>{obj.label}</span>
                {objectifPrincipal === obj.value && (
                  <CheckCircle2 className="h-4 w-4 text-[#7af17a] ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pourquoi — motivation */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/60">
            Pourquoi tu veux te lancer dans le setting ?
          </label>
          <textarea
            value={whyMotivation}
            onChange={(e) => setWhyMotivation(e.target.value.slice(0, 500))}
            placeholder="Décris ta motivation en quelques phrases..."
            rows={3}
            className="w-full bg-white/5 text-base text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-4 resize-none transition-colors duration-200"
          />
          <p className="text-xs text-white/30 text-right">
            {whyMotivation.length}/500
          </p>
        </div>

        {/* Disponibilité slider 1-8h */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/60">
            Heures disponibles par jour :{" "}
            <span className="text-[#7af17a] font-bold">
              {disponibilitesHeures}h
            </span>
          </label>
          <input
            type="range"
            min="1"
            max="8"
            value={disponibilitesHeures}
            onChange={(e) => setDisponibilitesHeures(e.target.value)}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#7af17a]"
          />
          <div className="flex justify-between text-xs text-white/30">
            <span>1h</span>
            <span>4h</span>
            <span>8h</span>
          </div>
        </div>

        {/* Niveau d'expérience */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-white/60">
            Ton niveau d&apos;expérience
          </label>
          <div className="space-y-2">
            {NIVEAUX.map((niv) => (
              <button
                key={niv.value}
                type="button"
                onClick={() => setNiveauExperience(niv.value)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-200",
                  niveauExperience === niv.value
                    ? "border-[#7af17a]/60 bg-[#7af17a]/10 text-white shadow-sm shadow-[#7af17a]/10"
                    : "border-white/10 bg-white/5 text-white/50 hover:border-white/20 hover:text-white/70",
                )}
              >
                <span>{niv.label}</span>
                {niveauExperience === niv.value && (
                  <CheckCircle2 className="h-4 w-4 text-[#7af17a] ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderB2CVideo() {
    const remaining = Math.max(0, 30 - videoWatchSeconds);

    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Video embed */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10">
          {welcomeVideoData?.videoUrl ? (
            <iframe
              src={welcomeVideoData.videoUrl}
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#7af17a]/20 flex items-center justify-center">
                <Play className="h-8 w-8 text-[#7af17a] ml-1" />
              </div>
              <p className="text-white/40 text-sm">Vidéo de présentation</p>
              <p className="text-white/30 text-xs">
                La vidéo sera bientôt disponible
              </p>
            </div>
          )}
        </div>

        {/* Timer / Unlock indicator */}
        <div className="flex items-center justify-center gap-3">
          {videoUnlocked ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#7af17a]/10 border border-[#7af17a]/30"
            >
              <CheckCircle2 className="h-4 w-4 text-[#7af17a]" />
              <span className="text-sm text-[#7af17a] font-medium">
                Vidéo complétée — tu peux continuer
              </span>
            </motion.div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Lock className="h-4 w-4 text-white/40" />
              <span className="text-sm text-white/40">
                Regarde pendant encore{" "}
                <span className="text-white font-medium tabular-nums">
                  {remaining}s
                </span>{" "}
                pour débloquer la suite
              </span>
            </div>
          )}
        </div>

        {/* Progress bar for video timer */}
        {!videoUnlocked && (
          <div className="w-full max-w-sm mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#7af17a] to-[#4ade80]"
              animate={{ width: `${(videoWatchSeconds / 30) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    );
  }

  async function handleSignContract() {
    setShowSignatureDialog(true);
  }

  async function onContractSigned() {
    setContractSigned(true);
    setShowSignatureDialog(false);
    // Fire confetti
    try {
      const confetti = (await import("canvas-confetti")).default;
      // Left side
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.2, y: 0.6 },
        colors: ["#7af17a", "#4ade80", "#22c55e", "#ffffff", "#fbbf24"],
      });
      // Right side
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.8, y: 0.6 },
          colors: ["#7af17a", "#4ade80", "#22c55e", "#ffffff", "#fbbf24"],
        });
      }, 200);
    } catch {
      // Non-blocking
    }
  }

  function renderB2CContract() {
    if (contractSigned) {
      // Show celebration after signing
      return (
        <div className="w-full max-w-md mx-auto space-y-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <div className="w-24 h-24 rounded-full bg-[#7af17a]/20 border-2 border-[#7af17a]/40 flex items-center justify-center mx-auto shadow-xl shadow-[#7af17a]/20">
              <Trophy className="h-12 w-12 text-[#7af17a]" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h2 className="text-3xl font-bold text-white">
              Bienvenue dans la{" "}
              <span className="text-[#7af17a]">S Academy</span> !
            </h2>
            <p className="text-white/50 text-base max-w-sm mx-auto">
              Ton contrat est signé. Tu as maintenant accès à toute la
              plateforme. On se retrouve sur ton dashboard !
            </p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            onClick={handleComplete}
            disabled={completing}
            className="mt-4 px-8 py-4 bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-105 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
          >
            {completing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Accéder à mon dashboard
              </>
            )}
          </motion.button>
        </div>
      );
    }

    // Show contract preview + sign button
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Contract preview card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          {/* Contract header */}
          <div className="p-6 border-b border-white/10 bg-[#7af17a]/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#7af17a]/20 flex items-center justify-center">
                <FileSignature className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  Contrat d&apos;Accompagnement
                </h3>
                <p className="text-white/40 text-xs">
                  Formation et Placement — Métier de Setter
                </p>
              </div>
            </div>
          </div>

          {/* Contract body — scrollable */}
          <div className="p-6 max-h-[40vh] overflow-y-auto space-y-4 text-sm text-white/60 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
            <p className="text-white/40 text-xs uppercase tracking-wider font-medium">
              Entre les soussignés
            </p>

            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-white/80 font-medium">LE PRESTATAIRE</p>
              <p>SalesSystem Academy — Représenté par Damien REYNAUD</p>
            </div>

            <p className="text-white font-medium mt-4">
              Article 1 — Objet du contrat
            </p>
            <p>
              SalesSystem Academy s&apos;engage à former le Client au métier de
              setter et à le placer dans une entreprise partenaire générant
              entre 10 000 et 200 000 euros de CA mensuel.
            </p>

            <p className="text-white font-medium mt-4">Article 2 — Formation</p>
            <ul className="list-disc list-inside space-y-1 text-white/50">
              <li>Fondamentaux du setting et psychologie de la vente</li>
              <li>Techniques de qualification (outbound et inbound)</li>
              <li>Copywriting appliqué aux messages et appels</li>
              <li>Accès aux templates, scripts et ressources</li>
              <li>Accompagnement personnalisé sans limitation de durée</li>
            </ul>

            <p className="text-white font-medium mt-4">Article 5 — Tarif</p>
            <div className="p-3 rounded-lg bg-[#7af17a]/5 border border-[#7af17a]/20">
              <p className="text-[#7af17a] font-bold text-lg">2 000 € TTC</p>
              <p className="text-white/40 text-xs">
                Formation complète + placement en entreprise
              </p>
            </div>

            <p className="text-white font-medium mt-4">
              Article 7 — Droit de rétractation
            </p>
            <p>
              Délai de rétractation de 14 jours à compter de la signature,
              conformément à l&apos;article L.221-18 du Code de la consommation.
            </p>

            <p className="text-white/30 text-xs mt-4">
              Le contrat complet (12 articles) sera disponible dans votre espace
              Contrats après signature.
            </p>
          </div>

          {/* Contract footer — sign CTA */}
          <div className="p-6 border-t border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <FileSignature className="h-4 w-4 text-white/40 shrink-0" />
              <p className="text-xs text-white/40">
                En signant, vous acceptez les termes du contrat
                d&apos;accompagnement. Signature électronique conforme au
                règlement eIDAS.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignContract}
              disabled={signingContract}
              className="w-full py-4 bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {signingContract ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <FileSignature className="h-5 w-5" />
                  Signer le contrat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  async function handleJoinCommunity() {
    if (joiningCommunity) return;
    setJoiningCommunity(true);
    try {
      await postWelcomeCommunityMessage(
        fullName || userName || "Nouveau membre",
      );
      setCommunityJoined(true);
      toast.success("Message posté dans la communauté !");
    } catch {
      // Allow to proceed even if post fails
      setCommunityJoined(true);
      toast.error("Impossible de poster, mais tu peux continuer");
    } finally {
      setJoiningCommunity(false);
    }
  }

  function renderB2CCommunity() {
    return (
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-[#7af17a]/10 border border-[#7af17a]/30 flex items-center justify-center mx-auto">
            <Users className="h-8 w-8 text-[#7af17a]" />
          </div>
          <p className="text-white/50 text-base max-w-sm mx-auto leading-relaxed">
            Rejoins la communauté et présente-toi aux autres membres. On
            publiera automatiquement un message de bienvenue dans le canal
            #général.
          </p>
        </div>

        {communityJoined ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 rounded-2xl bg-[#7af17a]/10 border border-[#7af17a]/30 text-center space-y-3"
          >
            <CheckCircle2 className="h-10 w-10 text-[#7af17a] mx-auto" />
            <p className="text-[#7af17a] font-medium">
              Bienvenue dans la communauté !
            </p>
            <p className="text-white/40 text-sm">
              Ton message de présentation a été posté dans #général
            </p>
          </motion.div>
        ) : (
          <button
            type="button"
            onClick={handleJoinCommunity}
            disabled={joiningCommunity}
            className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
          >
            {joiningCommunity ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Users className="h-5 w-5" />
                Rejoindre la communauté
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step renderers — B2B
  // ---------------------------------------------------------------------------

  function renderB2BQuestionnaire() {
    const CA_OPTIONS = [
      "Moins de 5 000 €",
      "5 000 € - 10 000 €",
      "10 000 € - 30 000 €",
      "30 000 € - 100 000 €",
      "Plus de 100 000 €",
    ];
    const PLATEFORMES = [
      "LinkedIn",
      "Instagram",
      "Facebook",
      "TikTok",
      "Email",
      "Téléphone",
      "Site web",
      "YouTube",
    ];

    return (
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Entreprise */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Nom de ton entreprise
          </label>
          <input
            ref={inputRef}
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Mon entreprise..."
            className="w-full bg-white/5 text-base text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-3 transition-colors duration-200"
          />
        </div>

        {/* Secteur */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Secteur d&apos;activité
          </label>
          <input
            type="text"
            value={secteur}
            onChange={(e) => setSecteur(e.target.value)}
            placeholder="Coaching, SaaS, E-commerce..."
            className="w-full bg-white/5 text-base text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-3 transition-colors duration-200"
          />
        </div>

        {/* Offre */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Décris ton offre principale
          </label>
          <textarea
            value={offre}
            onChange={(e) => setOffre(e.target.value)}
            placeholder="Quelle est ton offre et à quel prix ?"
            rows={2}
            className="w-full bg-white/5 text-base text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-3 resize-none transition-colors duration-200"
          />
        </div>

        {/* Cible */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Ta cible idéale
          </label>
          <input
            type="text"
            value={cible}
            onChange={(e) => setCible(e.target.value)}
            placeholder="Qui est ton client idéal ?"
            className="w-full bg-white/5 text-base text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-3 transition-colors duration-200"
          />
        </div>

        {/* CA mensuel */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Chiffre d&apos;affaires mensuel actuel
          </label>
          <div className="space-y-1.5">
            {CA_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCaMensuel(opt)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-all duration-200",
                  caMensuel === opt
                    ? "border-[#7af17a]/60 bg-[#7af17a]/10 text-white"
                    : "border-white/10 bg-white/5 text-white/50 hover:border-white/20",
                )}
              >
                <span>{opt}</span>
                {caMensuel === opt && (
                  <CheckCircle2 className="h-4 w-4 text-[#7af17a] ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plateformes */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Sur quelles plateformes tu prospectes ?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PLATEFORMES.map((pl) => {
              const selected = plateforme.includes(pl);
              return (
                <button
                  key={pl}
                  type="button"
                  onClick={() =>
                    setPlateforme((prev) =>
                      selected ? prev.filter((p) => p !== pl) : [...prev, pl],
                    )
                  }
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all duration-200",
                    selected
                      ? "border-[#7af17a]/60 bg-[#7af17a]/10 text-[#7af17a]"
                      : "border-white/10 bg-white/5 text-white/50 hover:border-white/20",
                  )}
                >
                  {selected ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-current shrink-0" />
                  )}
                  {pl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Objectif */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white/60">
            Ton objectif avec Sales System
          </label>
          <textarea
            value={objectifB2B}
            onChange={(e) => setObjectifB2B(e.target.value)}
            placeholder="Qu'est-ce que tu attends de la plateforme ?"
            rows={2}
            className="w-full bg-white/5 text-base text-white placeholder:text-white/20 border border-white/10 focus:border-[#7af17a]/50 outline-none rounded-xl p-3 resize-none transition-colors duration-200"
          />
        </div>
      </div>
    );
  }

  function renderB2BConfirmation() {
    const items = [
      { icon: FileText, label: "Entreprise", value: company || "Non défini" },
      { icon: Target, label: "Secteur", value: secteur || "Non défini" },
      {
        icon: FileText,
        label: "Offre",
        value: offre
          ? offre.slice(0, 60) + (offre.length > 60 ? "..." : "")
          : "Non défini",
      },
      { icon: User, label: "Cible", value: cible || "Non défini" },
      { icon: Sparkles, label: "CA mensuel", value: caMensuel || "Non défini" },
      {
        icon: Link2,
        label: "Plateformes",
        value: plateforme.length > 0 ? plateforme.join(", ") : "Aucune",
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="p-4 rounded-xl bg-[#7af17a]/5 border border-[#7af17a]/20 text-center"
        >
          <p className="text-sm text-white/60">
            Ton workspace sera automatiquement configuré avec un SOP
            personnalisé et un pipeline adapté à ton activité.
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={handleComplete}
          disabled={completing}
          className="w-full py-4 bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black font-semibold rounded-2xl text-lg shadow-xl shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {completing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Créer mon workspace
            </>
          )}
        </motion.button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step router
  // ---------------------------------------------------------------------------

  function renderStepContent() {
    switch (currentStep.type) {
      case "b2c_welcome":
        return renderB2CWelcome();
      case "b2c_profile":
        return renderB2CProfile();
      case "b2c_video":
        return renderB2CVideo();
      case "b2c_contract":
        return renderB2CContract();
      case "b2c_community":
        return renderB2CCommunity();
      case "b2b_questionnaire":
        return renderB2BQuestionnaire();
      case "b2b_confirmation":
        return renderB2BConfirmation();
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
      {currentStep.type !== "b2c_welcome" && (
        <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-[#7af17a] to-[#4ade80]"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      )}

      {/* Top bar */}
      {currentStep.type !== "b2c_welcome" && (
        <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4 pt-6">
          {/* Back button */}
          <button
            onClick={goPrev}
            className={cn(
              "h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all",
              step <= 0 && "opacity-0 pointer-events-none",
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
            {step + 1}/{steps.length}
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
            {/* Step title (not on welcome/confirmation) */}
            {currentStep.type !== "b2c_welcome" &&
              currentStep.type !== "b2b_confirmation" && (
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

            {/* B2B confirmation title */}
            {currentStep.type === "b2b_confirmation" && (
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
                <p className="text-white/40 mt-2">{currentStep.subtitle}</p>
              </div>
            )}

            {/* Step content */}
            <div className="flex flex-col items-center">
              {renderStepContent()}
            </div>

            {/* Continue button — shown for steps that need it (not welcome, not confirmation, not community when done) */}
            {currentStep.type !== "b2c_welcome" &&
              currentStep.type !== "b2b_confirmation" &&
              !isLast && (
                <div className="flex justify-center mt-10">
                  <button
                    onClick={goNext}
                    disabled={!canProceed()}
                    className={cn(
                      "group flex items-center gap-2 px-8 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200",
                      canProceed()
                        ? "bg-gradient-to-r from-[#7af17a] to-[#4ade80] text-black shadow-lg shadow-[#7af17a]/25 hover:shadow-[#7af17a]/40 hover:scale-105"
                        : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed",
                    )}
                  >
                    Continuer
                  </button>
                </div>
              )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Signature Dialog for contract */}
      {academyContractId && (
        <SignatureDialog
          contractId={academyContractId}
          contractName="Contrat d'Accompagnement Academy"
          amount={2000}
          open={showSignatureDialog}
          onOpenChange={setShowSignatureDialog}
          onCustomSubmit={async (signatureData, signerName) => {
            const { saveSignature } = await import("@/lib/actions/contracts");
            await saveSignature(academyContractId, signatureData, signerName);
            await onContractSigned();
          }}
        />
      )}

      {/* Footer hint */}
      <div className="fixed bottom-6 left-0 right-0 z-40 text-center">
        <p className="text-xs text-white/20">
          Tu pourras modifier ces informations dans tes paramètres
        </p>
      </div>
    </div>
  );
}
