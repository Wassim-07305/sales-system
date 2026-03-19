"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  ShieldCheck,
  Clock,
  User,
  Save,
  Linkedin,
  Instagram,
  MessageCircle,
  Mail,
  Send,
  Sparkles,
  Eye,
  Heart,
  Check,
  Network,
  AlertTriangle,
  Loader2,
  Zap,
} from "lucide-react";
import { updateAiModeConfig } from "@/lib/actions/ai-modes";
import { generatePersonalizedMessage } from "@/lib/actions/automation";
import type { AiMode, AiModeConfig } from "@/lib/types/database";
import { toast } from "sonner";

interface AiModesViewProps {
  config: AiModeConfig;
}

const AI_MODES: {
  value: AiMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "full_ai",
    label: "Full IA",
    description: "L'IA gere tout automatiquement",
    icon: <Bot className="h-6 w-6" />,
    color: "text-brand",
  },
  {
    value: "critical_validation",
    label: "Validation critique",
    description:
      "L'IA agit, mais demande validation pour les actions critiques",
    icon: <ShieldCheck className="h-6 w-6" />,
    color: "text-amber-500",
  },
  {
    value: "half_time",
    label: "Mi-temps",
    description: "L'IA suggere, vous validez chaque action",
    icon: <Clock className="h-6 w-6" />,
    color: "text-blue-500",
  },
  {
    value: "full_human",
    label: "Full humain",
    description: "Aucune assistance IA",
    icon: <User className="h-6 w-6" />,
    color: "text-muted-foreground",
  },
];

const NETWORKS = [
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="h-4 w-4" />,
    color: "text-[#0A66C2]",
    bg: "bg-[#0A66C2]/10",
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: <Instagram className="h-4 w-4" />,
    color: "text-[#E4405F]",
    bg: "bg-[#E4405F]/10",
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: <MessageCircle className="h-4 w-4" />,
    color: "text-[#25D366]",
    bg: "bg-[#25D366]/10",
  },
  {
    key: "email",
    label: "Email",
    icon: <Mail className="h-4 w-4" />,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
];

const CRITICAL_ACTIONS = [
  {
    label: "Envoi de message initial",
    description: "Premier contact avec un prospect",
  },
  { label: "Relance automatique", description: "Messages de suivi programmes" },
  { label: "Booking automatique", description: "Planification de rendez-vous" },
  {
    label: "Modification de prix",
    description: "Changement de tarifs ou remises",
  },
  {
    label: "Envoi de contrat",
    description: "Documents contractuels officiels",
  },
];

const STORY_EMOJIS = [
  { value: "\u{1F525}", label: "Feu" },
  { value: "\u{2764}\u{FE0F}", label: "Coeur" },
  { value: "\u{1F44F}", label: "Applaudissements" },
  { value: "\u{1F60D}", label: "Yeux coeurs" },
  { value: "\u{1F4AA}", label: "Biceps" },
  { value: "\u{1F680}", label: "Fusee" },
];

const AUTO_SEND_PLATFORMS = [
  {
    key: "instagram",
    label: "Instagram",
    icon: <Instagram className="h-5 w-5" />,
    color: "text-[#E4405F]",
    bg: "bg-[#E4405F]/10",
    borderActive: "border-[#E4405F]/50",
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="h-5 w-5" />,
    color: "text-[#0A66C2]",
    bg: "bg-[#0A66C2]/10",
    borderActive: "border-[#0A66C2]/50",
  },
];

const TEMPLATE_MAX_LENGTH = 500;

export function AiModesView({ config }: AiModesViewProps) {
  const [isPending, startTransition] = useTransition();
  const [globalMode, setGlobalMode] = useState<AiMode>(config.global_mode);
  const [networkOverrides, setNetworkOverrides] = useState<
    Record<string, AiMode>
  >(config.network_overrides || {});
  const [criticalActions, setCriticalActions] = useState<string[]>(
    config.critical_actions || [],
  );

  // Auto-send state
  const [autoSendEnabled, setAutoSendEnabled] = useState(
    config.auto_send_enabled ?? false,
  );
  const [autoSendPlatforms, setAutoSendPlatforms] = useState<string[]>(
    config.auto_send_platforms || [],
  );
  const [autoSendTemplate, setAutoSendTemplate] = useState(
    config.auto_send_template ||
      "Bonjour {nom}, j'ai vu votre activité autour de {activité} et j'ai trouvé {dernier_post} vraiment inspirant. J'aimerais échanger avec vous !",
  );
  const [autoSendMode, setAutoSendMode] = useState<AiMode>(
    config.auto_send_mode || "critical_validation",
  );

  // Story reaction state
  const [storyReactionEnabled, setStoryReactionEnabled] = useState(
    config.story_reaction_enabled ?? false,
  );
  const [storyReactionEmoji, setStoryReactionEmoji] = useState(
    config.story_reaction_emoji || "\u{1F525}",
  );

  // Preview state
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [isGeneratingPreview, startPreviewTransition] = useTransition();

  function handleToggleCriticalAction(action: string) {
    setCriticalActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action],
    );
  }

  function handleNetworkOverride(network: string, value: string) {
    setNetworkOverrides((prev) => {
      const updated = { ...prev };
      if (value === "global") {
        delete updated[network];
      } else {
        updated[network] = value as AiMode;
      }
      return updated;
    });
  }

  function handleToggleAutoSendPlatform(platform: string) {
    setAutoSendPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }

  function handlePreview() {
    startPreviewTransition(async () => {
      const { message } = await generatePersonalizedMessage(
        {
          name: "Marie Dupont",
          platform: autoSendPlatforms[0] || "instagram",
          activity: "le coaching en developpement personnel",
          recent_post: "votre video sur la gestion du stress",
          notes: null,
        },
        autoSendTemplate,
      );
      setPreviewMessage(message);
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateAiModeConfig({
        global_mode: globalMode,
        network_overrides: networkOverrides,
        critical_actions: criticalActions,
        auto_send_enabled: autoSendEnabled,
        auto_send_platforms: autoSendPlatforms,
        auto_send_template: autoSendTemplate,
        auto_send_mode: autoSendMode,
        story_reaction_enabled: storyReactionEnabled,
        story_reaction_emoji: storyReactionEmoji,
      });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configuration sauvegardee");
      }
    });
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Modes IA"
        description="Configurez le niveau d'assistance IA et l'envoi automatique"
      >
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="min-w-[160px]"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </PageHeader>

      {/* ------------------------------------------------------------------ */}
      {/* 1. Global Mode Selector                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-brand" />
            </div>
            <div>
              <CardTitle>Mode global</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Definissez le comportement par defaut de l&apos;IA sur toutes
                les plateformes
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_MODES.map((mode) => {
              const isSelected = globalMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setGlobalMode(mode.value)}
                  className={`group relative flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-brand bg-brand/5 shadow-[0_0_0_1px_rgba(122,241,122,0.1)]"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                  }`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                      <Check className="h-3 w-3 text-brand-foreground" />
                    </div>
                  )}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isSelected
                        ? "bg-brand/10"
                        : "bg-muted group-hover:bg-muted/80"
                    }`}
                  >
                    <div
                      className={
                        isSelected ? mode.color : "text-muted-foreground"
                      }
                    >
                      {mode.icon}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`font-semibold text-sm ${isSelected ? "text-foreground" : "text-foreground/80"}`}
                    >
                      {mode.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 2. AI Auto-Send Configuration                                      */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-brand" />
              </div>
              <div>
                <CardTitle>Envoi automatique IA</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  L&apos;IA personnalise et envoie des messages de prospection
                </p>
              </div>
            </div>
            <Switch
              checked={autoSendEnabled}
              onCheckedChange={setAutoSendEnabled}
            />
          </div>
        </CardHeader>

        {autoSendEnabled && (
          <CardContent className="space-y-6">
            {/* Platform selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Plateformes actives</Label>
              <div className="flex flex-wrap gap-3">
                {AUTO_SEND_PLATFORMS.map((p) => {
                  const isActive = autoSendPlatforms.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleToggleAutoSendPlatform(p.key)}
                      className={`group relative flex items-center gap-3 rounded-xl border-2 px-5 py-3.5 transition-all cursor-pointer ${
                        isActive
                          ? `${p.borderActive} bg-card shadow-sm`
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                          isActive ? p.bg : "bg-muted"
                        }`}
                      >
                        <div
                          className={
                            isActive ? p.color : "text-muted-foreground"
                          }
                        >
                          {p.icon}
                        </div>
                      </div>
                      <span
                        className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {p.label}
                      </span>
                      {isActive && (
                        <Badge className="ml-1 bg-brand/10 text-brand border-brand/20 text-[10px]">
                          Actif
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* AI Mode for auto-send */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Mode IA pour l&apos;envoi
              </Label>
              <Select
                value={autoSendMode}
                onValueChange={(v) => setAutoSendMode(v as AiMode)}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_ai">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-brand" />
                      <span>Full IA — Envoi direct sans validation</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="critical_validation">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-amber-500" />
                      <span>Validation critique — Relecture avant envoi</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="full_human">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Full humain — Genere mais n&apos;envoie pas</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {autoSendMode === "full_ai" &&
                  "L'IA envoie les messages directement sans votre validation."}
                {autoSendMode === "critical_validation" &&
                  "L'IA genere le message et attend votre validation avant envoi."}
                {autoSendMode === "full_human" &&
                  "L'IA genere une suggestion de message mais ne l'envoie jamais."}
              </p>
            </div>

            <Separator />

            {/* Message template editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Template de message
                </Label>
                <div className="flex gap-1.5">
                  {[
                    {
                      var: "{nom}",
                      tooltip: "Remplace par le nom du prospect",
                    },
                    {
                      var: "{activite}",
                      tooltip: "Remplace par l'activité du prospect",
                    },
                    {
                      var: "{dernier_post}",
                      tooltip: "Remplace par le dernier post du prospect",
                    },
                  ].map((v) => (
                    <Badge
                      key={v.var}
                      variant="secondary"
                      className="text-[10px] cursor-pointer font-mono px-2 py-0.5 hover:bg-brand/10 hover:text-brand transition-colors"
                      title={v.tooltip}
                      onClick={() =>
                        setAutoSendTemplate((prev) => prev + " " + v.var)
                      }
                    >
                      {v.var}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Textarea
                  value={autoSendTemplate}
                  onChange={(e) => {
                    if (e.target.value.length <= TEMPLATE_MAX_LENGTH) {
                      setAutoSendTemplate(e.target.value);
                    }
                  }}
                  placeholder="Bonjour {nom}, j'ai vu votre activité..."
                  rows={4}
                  className="resize-none pr-16"
                />
                <span
                  className={`absolute bottom-2.5 right-3 text-[10px] tabular-nums ${
                    autoSendTemplate.length > TEMPLATE_MAX_LENGTH * 0.9
                      ? "text-destructive"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {autoSendTemplate.length}/{TEMPLATE_MAX_LENGTH}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                L&apos;IA utilisera ce template comme base et le personnalisera
                pour chaque prospect. Cliquez sur une variable pour
                l&apos;inserer.
              </p>
            </div>

            <Separator />

            {/* Preview section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Apercu du message genere
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isGeneratingPreview}
                  className="gap-2"
                >
                  {isGeneratingPreview ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                  {isGeneratingPreview ? "Generation..." : "Generer un apercu"}
                </Button>
              </div>
              {previewMessage ? (
                <div className="rounded-xl border bg-muted/20 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-brand/10 text-brand border-brand/20 gap-1.5 px-2.5 py-1">
                      <Bot className="h-3 w-3" />
                      Message IA
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Exemple pour : Marie Dupont (Instagram)
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed pl-0.5">
                    {previewMessage}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted/50 mb-3">
                    <Sparkles className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur &quot;Generer un apercu&quot; pour voir un
                    exemple
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Le message sera personnalise avec les donnees d&apos;un
                    prospect fictif
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. Instagram Story Reactions                                       */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <CardTitle>Reaction automatique aux stories</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Reagir automatiquement aux stories Instagram des prospects
                </p>
              </div>
            </div>
            <Switch
              checked={storyReactionEnabled}
              onCheckedChange={setStoryReactionEnabled}
            />
          </div>
        </CardHeader>

        {storyReactionEnabled && (
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Emoji de reaction</Label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {STORY_EMOJIS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setStoryReactionEmoji(e.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all cursor-pointer ${
                      storyReactionEmoji === e.value
                        ? "border-brand bg-brand/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <span className="text-2xl leading-none">{e.value}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {e.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Emoji personnalise</Label>
              <p className="text-xs text-muted-foreground">
                Collez un emoji de votre choix pour remplacer la selection
                ci-dessus
              </p>
              <Input
                value={storyReactionEmoji}
                onChange={(e) => setStoryReactionEmoji(e.target.value)}
                placeholder="Collez un emoji..."
                className="max-w-[200px] text-center text-lg"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 4. Network Overrides                                               */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Network className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>Surcharges par reseau</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Definissez un mode IA specifique pour chaque reseau, ou laissez
                le mode global s&apos;appliquer
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {NETWORKS.map((network) => (
              <div
                key={network.key}
                className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${network.bg}`}
                  >
                    <div className={network.color}>{network.icon}</div>
                  </div>
                  <div>
                    <Label className="font-medium text-sm">
                      {network.label}
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      {networkOverrides[network.key]
                        ? AI_MODES.find(
                            (m) => m.value === networkOverrides[network.key],
                          )?.label
                        : "Utilise le mode global"}
                    </p>
                  </div>
                </div>
                <Select
                  value={networkOverrides[network.key] || "global"}
                  onValueChange={(value) =>
                    handleNetworkOverride(network.key, value)
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      Mode global (
                      {AI_MODES.find((m) => m.value === globalMode)?.label})
                    </SelectItem>
                    <Separator className="my-1" />
                    {AI_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 5. Critical Actions                                                */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Actions critiques</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                En mode &quot;Validation critique&quot;, ces actions
                necessiteront votre approbation
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {globalMode !== "critical_validation" && (
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Les actions critiques ne s&apos;appliquent qu&apos;en mode
                &quot;Validation critique&quot;. Le mode actuel est :{" "}
                <span className="font-medium text-foreground">
                  {AI_MODES.find((m) => m.value === globalMode)?.label}
                </span>
                .
              </p>
            </div>
          )}
          <div className="space-y-2">
            {CRITICAL_ACTIONS.map((action) => (
              <div
                key={action.label}
                className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition-colors ${
                  criticalActions.includes(action.label)
                    ? "bg-muted/20 border-border"
                    : "border-border/50"
                }`}
              >
                <div className="space-y-0.5">
                  <Label
                    htmlFor={`action-${action.label}`}
                    className="font-medium text-sm cursor-pointer"
                  >
                    {action.label}
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <Switch
                  id={`action-${action.label}`}
                  checked={criticalActions.includes(action.label)}
                  onCheckedChange={() =>
                    handleToggleCriticalAction(action.label)
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar for mobile */}
      <div className="sticky bottom-0 sm:hidden -mx-4 border-t bg-background/95 backdrop-blur-sm px-4 py-3">
        <Button onClick={handleSave} disabled={isPending} className="w-full">
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isPending ? "Enregistrement..." : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  );
}
