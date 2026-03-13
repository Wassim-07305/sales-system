"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Trash2,
  Eye,
  EyeOff,
  CreditCard,
  Mail,
  Brain,
  Mic,
  BellRing,
  MessageCircle,
  Instagram,
  Linkedin,
  Calendar,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { saveApiKey, deleteApiKey } from "@/lib/api-keys";

interface IntegrationService {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  keys: { key: string; label: string; placeholder: string }[];
}

const INTEGRATION_GROUPS: {
  label: string;
  services: IntegrationService[];
}[] = [
  {
    label: "Paiements",
    services: [
      {
        id: "stripe",
        name: "Stripe",
        description: "Traitement des paiements et abonnements",
        icon: <CreditCard className="h-5 w-5" />,
        keys: [
          {
            key: "STRIPE_SECRET_KEY",
            label: "Clé secrète Stripe",
            placeholder: "sk_live_...",
          },
        ],
      },
    ],
  },
  {
    label: "Email",
    services: [
      {
        id: "resend",
        name: "Resend",
        description: "Envoi d'emails transactionnels et notifications",
        icon: <Mail className="h-5 w-5" />,
        keys: [
          {
            key: "RESEND_API_KEY",
            label: "Clé API Resend",
            placeholder: "re_...",
          },
        ],
      },
    ],
  },
  {
    label: "Intelligence Artificielle",
    services: [
      {
        id: "openrouter",
        name: "OpenRouter",
        description: "Accès aux modèles IA (GPT, Claude, Mistral...)",
        icon: <Brain className="h-5 w-5" />,
        keys: [
          {
            key: "OPENROUTER_API_KEY",
            label: "Clé API OpenRouter",
            placeholder: "sk-or-...",
          },
        ],
      },
    ],
  },
  {
    label: "Voix",
    services: [
      {
        id: "elevenlabs",
        name: "ElevenLabs",
        description: "Synthèse vocale et voix IA",
        icon: <Mic className="h-5 w-5" />,
        keys: [
          {
            key: "ELEVENLABS_API_KEY",
            label: "Clé API ElevenLabs",
            placeholder: "xi_...",
          },
        ],
      },
    ],
  },
  {
    label: "Notifications Push",
    services: [
      {
        id: "vapid",
        name: "Web Push (VAPID)",
        description: "Notifications push navigateur",
        icon: <BellRing className="h-5 w-5" />,
        keys: [
          {
            key: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
            label: "Clé publique VAPID",
            placeholder: "BH...",
          },
          {
            key: "VAPID_PRIVATE_KEY",
            label: "Clé privée VAPID",
            placeholder: "...",
          },
        ],
      },
    ],
  },
  {
    label: "WhatsApp",
    services: [
      {
        id: "whatsapp",
        name: "WhatsApp Business",
        description: "Intégration WhatsApp Business API",
        icon: <MessageCircle className="h-5 w-5" />,
        keys: [
          {
            key: "WHATSAPP_ACCESS_TOKEN",
            label: "Token d'accès WhatsApp",
            placeholder: "EAA...",
          },
          {
            key: "WHATSAPP_PHONE_NUMBER_ID",
            label: "ID du numéro de téléphone",
            placeholder: "1234567890",
          },
        ],
      },
    ],
  },
  {
    label: "Réseaux sociaux",
    services: [
      {
        id: "instagram",
        name: "Instagram",
        description: "Prospection et automatisation Instagram",
        icon: <Instagram className="h-5 w-5" />,
        keys: [
          {
            key: "INSTAGRAM_ACCESS_TOKEN",
            label: "Token d'accès Instagram",
            placeholder: "IGQ...",
          },
        ],
      },
      {
        id: "linkedin",
        name: "LinkedIn",
        description: "Prospection et automatisation LinkedIn",
        icon: <Linkedin className="h-5 w-5" />,
        keys: [
          {
            key: "LINKEDIN_ACCESS_TOKEN",
            label: "Token d'accès LinkedIn",
            placeholder: "AQV...",
          },
        ],
      },
    ],
  },
  {
    label: "Google Calendar",
    services: [
      {
        id: "google",
        name: "Google Calendar",
        description: "Synchronisation de calendrier et OAuth",
        icon: <Calendar className="h-5 w-5" />,
        keys: [
          {
            key: "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
            label: "Client ID Google",
            placeholder: "123456789.apps.googleusercontent.com",
          },
          {
            key: "GOOGLE_CLIENT_SECRET",
            label: "Client Secret Google",
            placeholder: "GOCSPX-...",
          },
        ],
      },
    ],
  },
];

interface IntegrationsViewProps {
  initialStatus: Record<string, boolean>;
}

export function IntegrationsView({ initialStatus }: IntegrationsViewProps) {
  const [status, setStatus] = useState(initialStatus);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [savingService, setSavingService] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleVisibility(key: string) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleValueChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave(service: IntegrationService) {
    const keysToSave = service.keys.filter((k) => values[k.key]?.trim());
    if (keysToSave.length === 0) {
      toast.error("Veuillez remplir au moins un champ");
      return;
    }

    setSavingService(service.id);
    startTransition(async () => {
      let hasError = false;
      for (const k of keysToSave) {
        const result = await saveApiKey(k.key, values[k.key].trim());
        if (!result.success) {
          toast.error(`Erreur pour ${k.label}: ${result.error}`);
          hasError = true;
        }
      }

      if (!hasError) {
        toast.success(`${service.name} configuré avec succès`);
        // Update status
        const newStatus = { ...status };
        for (const k of keysToSave) {
          newStatus[k.key] = true;
        }
        setStatus(newStatus);
        // Clear values
        const newValues = { ...values };
        for (const k of keysToSave) {
          delete newValues[k.key];
        }
        setValues(newValues);
      }
      setSavingService(null);
    });
  }

  function handleDelete(service: IntegrationService) {
    startTransition(async () => {
      for (const k of service.keys) {
        await deleteApiKey(k.key);
      }
      const newStatus = { ...status };
      for (const k of service.keys) {
        newStatus[k.key] = false;
      }
      setStatus(newStatus);
      toast.success(`Clés ${service.name} supprimées`);
    });
  }

  function isServiceConfigured(service: IntegrationService): boolean {
    return service.keys.every((k) => status[k.key]);
  }

  function isServicePartial(service: IntegrationService): boolean {
    const configured = service.keys.filter((k) => status[k.key]).length;
    return configured > 0 && configured < service.keys.length;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {INTEGRATION_GROUPS.map((group) => (
        <div key={group.label} className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {group.label}
          </h2>

          {group.services.map((service) => {
            const configured = isServiceConfigured(service);
            const partial = isServicePartial(service);
            const isSaving = savingService === service.id;

            return (
              <Card key={service.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted">
                        {service.icon}
                      </div>
                      <div>
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {service.description}
                        </CardDescription>
                      </div>
                    </div>
                    {configured ? (
                      <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connecté
                      </Badge>
                    ) : partial ? (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                        Partiel
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <XCircle className="h-3 w-3 mr-1" />
                        Non configuré
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {service.keys.map((k) => (
                    <div key={k.key} className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {k.label}
                        {status[k.key] && (
                          <span className="ml-2 text-emerald-500 text-[10px]">
                            (configuré)
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type={visible[k.key] ? "text" : "password"}
                          value={values[k.key] || ""}
                          onChange={(e) => handleValueChange(k.key, e.target.value)}
                          placeholder={
                            status[k.key]
                              ? "••••••••••••••••"
                              : k.placeholder
                          }
                          className="pr-10 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => toggleVisibility(k.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {visible[k.key] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(service)}
                      disabled={isSaving || isPending}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-2" />
                      )}
                      Enregistrer
                    </Button>
                    {configured && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(service)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Supprimer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            Les clés API sont stockées de manière sécurisée dans votre base de données.
            Les variables d&apos;environnement du serveur sont prioritaires sur les valeurs
            configurées ici. Seuls les administrateurs peuvent modifier ces paramètres.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
