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
  Bot, ShieldCheck, Clock, User, Save, Linkedin, Instagram,
  MessageCircle, Mail, Send, Sparkles, Eye, Heart,
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
}[] = [
  {
    value: "full_ai",
    label: "Full IA",
    description: "L'IA gere tout automatiquement",
    icon: <Bot className="h-6 w-6" />,
  },
  {
    value: "critical_validation",
    label: "Validation critique",
    description: "L'IA agit, mais demande validation pour les actions critiques",
    icon: <ShieldCheck className="h-6 w-6" />,
  },
  {
    value: "half_time",
    label: "Mi-temps",
    description: "L'IA suggere, vous validez chaque action",
    icon: <Clock className="h-6 w-6" />,
  },
  {
    value: "full_human",
    label: "Full humain",
    description: "Aucune assistance IA",
    icon: <User className="h-6 w-6" />,
  },
];

const NETWORKS = [
  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> },
  { key: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
  { key: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
  { key: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
];

const CRITICAL_ACTIONS = [
  "Envoi de message initial",
  "Relance automatique",
  "Booking automatique",
  "Modification de prix",
  "Envoi de contrat",
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
  { key: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" /> },
  { key: "linkedin", label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> },
];

export function AiModesView({ config }: AiModesViewProps) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [globalMode, setGlobalMode] = useState<AiMode>(config.global_mode);
  const [networkOverrides, setNetworkOverrides] = useState<Record<string, AiMode>>(
    config.network_overrides || {}
  );
  const [criticalActions, setCriticalActions] = useState<string[]>(
    config.critical_actions || []
  );

  // Auto-send state
  const [autoSendEnabled, setAutoSendEnabled] = useState(config.auto_send_enabled ?? false);
  const [autoSendPlatforms, setAutoSendPlatforms] = useState<string[]>(
    config.auto_send_platforms || []
  );
  const [autoSendTemplate, setAutoSendTemplate] = useState(
    config.auto_send_template || "Bonjour {nom}, j'ai vu votre activite autour de {activite} et j'ai trouve {dernier_post} vraiment inspirant. J'aimerais echanger avec vous !"
  );
  const [autoSendMode, setAutoSendMode] = useState<AiMode>(
    config.auto_send_mode || "critical_validation"
  );

  // Story reaction state
  const [storyReactionEnabled, setStoryReactionEnabled] = useState(config.story_reaction_enabled ?? false);
  const [storyReactionEmoji, setStoryReactionEmoji] = useState(config.story_reaction_emoji || "\u{1F525}");

  // Preview state
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [isGeneratingPreview, startPreviewTransition] = useTransition();

  function handleToggleCriticalAction(action: string) {
    setCriticalActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action]
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
        : [...prev, platform]
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
        autoSendTemplate
      );
      setPreviewMessage(message);
    });
  }

  function handleSave() {
    setSaved(false);
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
        setSaved(true);
        toast.success("Configuration sauvegardee");
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Modes IA"
        description="Configurez le niveau d'assistance IA et l'envoi automatique"
      >
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </PageHeader>

      {saved && (
        <div className="mb-6 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-green-700">
          Configuration sauvegardee
        </div>
      )}

      {/* Global Mode Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mode global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AI_MODES.map((mode) => {
              const isSelected = globalMode === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setGlobalMode(mode.value)}
                  className={`flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-colors cursor-pointer ${
                    isSelected
                      ? "border-brand bg-brand/5"
                      : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      isSelected
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {mode.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{mode.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {mode.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Auto-Send Configuration */}
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
                      className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-colors cursor-pointer ${
                        isActive
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-border hover:border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {p.icon}
                      <span className="text-sm font-medium">{p.label}</span>
                      {isActive && (
                        <Badge variant="outline" className="ml-1 bg-brand/10 text-brand border-brand/20 text-[10px]">
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
              <Label className="text-sm font-medium">Mode IA pour l&apos;envoi</Label>
              <Select value={autoSendMode} onValueChange={(v) => setAutoSendMode(v as AiMode)}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_ai">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Full IA — Envoi direct sans validation
                    </div>
                  </SelectItem>
                  <SelectItem value="critical_validation">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Validation critique — Relecture avant envoi
                    </div>
                  </SelectItem>
                  <SelectItem value="full_human">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full humain — Genere mais n&apos;envoie pas
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {autoSendMode === "full_ai" && "L'IA envoie les messages directement sans votre validation."}
                {autoSendMode === "critical_validation" && "L'IA genere le message et attend votre validation avant envoi."}
                {autoSendMode === "full_human" && "L'IA genere une suggestion de message mais ne l'envoie jamais."}
              </p>
            </div>

            <Separator />

            {/* Message template editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Template de message</Label>
                <div className="flex gap-1.5">
                  <Badge variant="outline" className="text-[10px] cursor-help" title="Remplace par le nom du prospect">
                    {"{nom}"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] cursor-help" title="Remplace par l'activite du prospect">
                    {"{activite}"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] cursor-help" title="Remplace par le dernier post du prospect">
                    {"{dernier_post}"}
                  </Badge>
                </div>
              </div>
              <Textarea
                value={autoSendTemplate}
                onChange={(e) => setAutoSendTemplate(e.target.value)}
                placeholder="Bonjour {nom}, j'ai vu votre activite..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                L&apos;IA utilisera ce template comme base et le personnalisera pour chaque prospect.
              </p>
            </div>

            <Separator />

            {/* Preview section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Apercu du message genere</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={isGeneratingPreview}
                >
                  {isGeneratingPreview ? (
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {isGeneratingPreview ? "Generation..." : "Generer un apercu"}
                </Button>
              </div>
              {previewMessage && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-brand/10 text-brand border-brand/20 gap-1">
                      <Bot className="h-3 w-3" />
                      IA
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Exemple pour : Marie Dupont (Instagram)
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{previewMessage}</p>
                </div>
              )}
              {!previewMessage && (
                <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur &quot;Generer un apercu&quot; pour voir un exemple de message personnalise
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Instagram Story Reactions */}
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
          <CardContent>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Emoji de reaction</Label>
              <div className="flex flex-wrap gap-3">
                {STORY_EMOJIS.map((e) => (
                  <button
                    key={e.value}
                    type="button"
                    onClick={() => setStoryReactionEmoji(e.value)}
                    className={`flex items-center gap-2 rounded-lg border-2 px-4 py-2.5 transition-colors cursor-pointer ${
                      storyReactionEmoji === e.value
                        ? "border-brand bg-brand/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className="text-xl">{e.value}</span>
                    <span className="text-xs text-muted-foreground">{e.label}</span>
                  </button>
                ))}
              </div>
              <Input
                value={storyReactionEmoji}
                onChange={(e) => setStoryReactionEmoji(e.target.value)}
                placeholder="Ou saisissez un emoji personnalise..."
                className="max-w-xs mt-2"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Network Overrides */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Surcharges par reseau</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Definissez un mode IA specifique pour chaque reseau, ou laissez le mode global s&apos;appliquer.
          </p>
          <div className="space-y-4">
            {NETWORKS.map((network) => (
              <div
                key={network.key}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                    {network.icon}
                  </div>
                  <Label className="font-medium">{network.label}</Label>
                </div>
                <Select
                  value={networkOverrides[network.key] || "global"}
                  onValueChange={(value) =>
                    handleNetworkOverride(network.key, value)
                  }
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      Mode global ({AI_MODES.find((m) => m.value === globalMode)?.label})
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

      {/* Critical Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions critiques</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            En mode &quot;Validation critique&quot;, ces actions necessiteront votre approbation avant execution.
          </p>
          <div className="space-y-4">
            {CRITICAL_ACTIONS.map((action) => (
              <div
                key={action}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <Label htmlFor={`action-${action}`} className="font-medium cursor-pointer">
                  {action}
                </Label>
                <Switch
                  id={`action-${action}`}
                  checked={criticalActions.includes(action)}
                  onCheckedChange={() => handleToggleCriticalAction(action)}
                />
              </div>
            ))}
          </div>
          {globalMode !== "critical_validation" && (
            <p className="mt-4 text-xs text-muted-foreground italic">
              Les actions critiques ne s&apos;appliquent qu&apos;en mode &quot;Validation critique&quot;.
              Le mode actuel est : {AI_MODES.find((m) => m.value === globalMode)?.label}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
