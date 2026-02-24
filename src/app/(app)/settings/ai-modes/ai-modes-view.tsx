"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, ShieldCheck, Clock, User, Save, Linkedin, Instagram, MessageCircle, Mail } from "lucide-react";
import { updateAiModeConfig } from "@/lib/actions/ai-modes";
import type { AiMode, AiModeConfig } from "@/lib/types/database";

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

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateAiModeConfig({
        global_mode: globalMode,
        network_overrides: networkOverrides,
        critical_actions: criticalActions,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div>
      <PageHeader
        title="Modes IA"
        description="Configurez le niveau d'assistance IA"
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
