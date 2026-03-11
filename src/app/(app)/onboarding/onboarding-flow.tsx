"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { completeSimpleOnboarding } from "@/lib/actions/onboarding";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Camera,
  Building2,
  User,
  FileText,
  Target,
  Link,
} from "lucide-react";

interface OnboardingFlowProps {
  role: string;
  userId: string;
}

interface StepDef {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
}

const B2C_STEPS: StepDef[] = [
  {
    id: "photo",
    title: "Photo de profil",
    icon: User,
    description: "Ajoutez une photo pour personnaliser votre compte",
  },
  {
    id: "identity",
    title: "Vos informations",
    icon: User,
    description: "Dites-nous qui vous êtes",
  },
  {
    id: "skills",
    title: "Votre profil",
    icon: Target,
    description: "Décrivez votre expertise",
  },
];

const B2B_STEPS: StepDef[] = [
  {
    id: "photo",
    title: "Photo & Entreprise",
    icon: Building2,
    description: "Votre identité professionnelle",
  },
  {
    id: "business",
    title: "Votre business",
    icon: FileText,
    description: "Décrivez votre activité en détail",
  },
  {
    id: "qualification",
    title: "Qualification",
    icon: Target,
    description: "Vos questions de qualification",
  },
  {
    id: "channels",
    title: "Prospection",
    icon: Target,
    description: "Vos canaux de prospection",
  },
  {
    id: "social",
    title: "Réseaux sociaux",
    icon: Link,
    description: "Vos comptes LinkedIn et Instagram",
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

export function OnboardingFlow({ role, userId }: OnboardingFlowProps) {
  const router = useRouter();
  const steps = role === "client_b2b" ? B2B_STEPS : B2C_STEPS;
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  // Form data
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [businessDesc, setBusinessDesc] = useState("");
  const [qualificationQ, setQualificationQ] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [otherChannel, setOtherChannel] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress =
    steps.length === 1 ? 100 : (currentStep / (steps.length - 1)) * 100;
  const isLastStep = currentStep === steps.length - 1;

  async function handleAvatarUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
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
      toast.success("Photo uploadée avec succès !");
    } catch {
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function toggleChannel(channel: string) {
    setChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    );
  }

  function goNext() {
    setDirection("forward");
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => s + 1);
      setAnimating(false);
    }, 200);
  }

  function goPrev() {
    setDirection("back");
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep((s) => s - 1);
      setAnimating(false);
    }, 200);
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      const allChannels = [
        ...channels,
        ...(otherChannel.trim() ? [otherChannel.trim()] : []),
      ];
      const result = await completeSimpleOnboarding({
        full_name: fullName || undefined,
        phone: phone || undefined,
        company: company || undefined,
        avatar_url: avatarUrl || undefined,
        bio: bio || undefined,
        skills: skills || undefined,
        business_description: businessDesc || undefined,
        qualification_questions: qualificationQ || undefined,
        prospection_channels: allChannels.length > 0 ? allChannels : undefined,
        linkedin_url: linkedinUrl || undefined,
        instagram_username: instagramUsername || undefined,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Profil complété ! Bienvenue sur la plateforme 🎉");
        router.push("/dashboard");
      }
    } catch {
      toast.error("Une erreur est survenue, veuillez réessayer");
    } finally {
      setCompleting(false);
    }
  }

  const step = steps[currentStep];
  const StepIcon = step.icon;

  // Render step content
  function renderStepContent() {
    const stepId = step.id;

    if (stepId === "photo") {
      return (
        <div className="space-y-6">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative group w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 hover:border-[#7af17a]/60 transition-all duration-300 bg-white/5 flex items-center justify-center"
            >
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Aperçu"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="h-8 w-8 text-white/40 group-hover:text-[#7af17a] transition-colors" />
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
            <p className="text-sm text-white/50">
              Cliquez pour choisir une photo (max 5 Mo)
            </p>
          </div>

          {/* Company name for B2B */}
          {role === "client_b2b" && (
            <div className="space-y-2">
              <Label className="text-white/80">Nom de l&apos;entreprise</Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Ex : AgenceX, SaaS Corp..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50"
              />
            </div>
          )}
        </div>
      );
    }

    if (stepId === "identity") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">Prénom et Nom</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex : Jean Dupont"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Téléphone</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : +33 6 12 34 56 78"
              type="tel"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50"
            />
          </div>
        </div>
      );
    }

    if (stepId === "skills") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">
              Bio courte{" "}
              <span className="text-white/40 text-xs">({bio.length}/200)</span>
            </Label>
            <Textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value.slice(0, 200))
              }
              placeholder="Parlez-nous de vous en quelques mots..."
              rows={3}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Compétences</Label>
            <Input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Ex : cold calling, LinkedIn, closing..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50"
            />
            <p className="text-xs text-white/40">
              Séparez vos compétences par des virgules
            </p>
          </div>
        </div>
      );
    }

    if (stepId === "business") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">
              Ce que vous faites exactement
            </Label>
            <Textarea
              value={businessDesc}
              onChange={(e) => setBusinessDesc(e.target.value)}
              placeholder="Décrivez votre activité, votre offre, votre marché cible..."
              rows={5}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50 resize-none"
            />
          </div>
        </div>
      );
    }

    if (stepId === "qualification") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">
              Vos questions de qualification
            </Label>
            <p className="text-xs text-white/40">
              Quelles questions posez-vous pour qualifier un prospect ?
            </p>
            <Textarea
              value={qualificationQ}
              onChange={(e) => setQualificationQ(e.target.value)}
              placeholder={"Ex :\n- Quel est votre budget ?\n- Depuis combien de temps cherchez-vous une solution ?\n- Qui prend la décision finale ?"}
              rows={6}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50 resize-none"
            />
          </div>
        </div>
      );
    }

    if (stepId === "channels") {
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-white/80">
              Vos canaux de prospection principaux
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((channel) => {
                const selected = channels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200",
                      selected
                        ? "border-[#7af17a]/60 bg-[#7af17a]/10 text-[#7af17a]"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/80"
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
          <div className="space-y-2">
            <Label className="text-white/80">
              Autre canal{" "}
              <span className="text-white/40 text-xs">(optionnel)</span>
            </Label>
            <Input
              value={otherChannel}
              onChange={(e) => setOtherChannel(e.target.value)}
              placeholder="Ex : TikTok, YouTube, Podcast..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50"
            />
          </div>
        </div>
      );
    }

    if (stepId === "social") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">URL LinkedIn</Label>
            <Input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/votre-profil"
              type="url"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Username Instagram</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                @
              </span>
              <Input
                value={instagramUsername}
                onChange={(e) =>
                  setInstagramUsername(e.target.value.replace(/^@/, ""))
                }
                placeholder="votre_username"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#7af17a]/50 pl-7"
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(122,241,122,0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(122,241,122,0.03) 0%, transparent 50%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.01'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main card */}
      <div className="relative w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-white/40 font-medium tracking-wider uppercase">
              Étape {currentStep + 1} sur {steps.length}
            </span>
            <span className="text-xs text-[#7af17a] font-semibold">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7af17a] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stepper dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                "transition-all duration-300 rounded-full",
                i === currentStep
                  ? "w-6 h-2 bg-[#7af17a]"
                  : i < currentStep
                  ? "w-2 h-2 bg-[#7af17a]/50"
                  : "w-2 h-2 bg-white/15"
              )}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Step header */}
          <div
            className={cn(
              "transition-all duration-200",
              animating
                ? direction === "forward"
                  ? "opacity-0 translate-x-4"
                  : "opacity-0 -translate-x-4"
                : "opacity-100 translate-x-0"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#7af17a]/10 border border-[#7af17a]/20 flex items-center justify-center">
                <StepIcon className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{step.title}</h2>
                <p className="text-sm text-white/50">{step.description}</p>
              </div>
            </div>

            <div className="h-px bg-white/10 my-6" />

            {/* Step content */}
            <div className="min-h-[200px]">{renderStepContent()}</div>

            <div className="h-px bg-white/10 my-6" />

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              {currentStep > 0 ? (
                <Button
                  variant="ghost"
                  onClick={goPrev}
                  disabled={completing}
                  className="text-white/60 hover:text-white hover:bg-white/10 gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Précédent
                </Button>
              ) : (
                <div />
              )}

              {isLastStep ? (
                <Button
                  onClick={handleComplete}
                  disabled={completing}
                  className="bg-[#7af17a] text-black hover:bg-[#7af17a]/90 font-semibold gap-2 flex-1 max-w-xs"
                >
                  {completing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Terminer et accéder au dashboard
                </Button>
              ) : (
                <Button
                  onClick={goNext}
                  className="bg-[#7af17a] text-black hover:bg-[#7af17a]/90 font-semibold gap-2"
                >
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/20 mt-6">
          Vous pouvez modifier ces informations à tout moment dans vos paramètres
        </p>
      </div>
    </div>
  );
}
