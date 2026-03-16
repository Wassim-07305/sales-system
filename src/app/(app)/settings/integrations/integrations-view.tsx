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
  Unplug,
  ExternalLink,
  Plus,
  RefreshCw,
  Send,
} from "lucide-react";
import { saveApiKey, deleteApiKey } from "@/lib/api-keys";
import {
  generateUnipileAuthLink,
  disconnectUnipileAccount,
  getUnipileStatus,
} from "@/lib/actions/unipile";

// ---------------------------------------------------------------------------
// Unipile provider config
// ---------------------------------------------------------------------------

const UNIPILE_PROVIDERS = [
  {
    id: "LINKEDIN",
    name: "LinkedIn",
    description: "Prospection, messaging et profils",
    icon: <Linkedin className="h-4 w-4" />,
  },
  {
    id: "INSTAGRAM",
    name: "Instagram",
    description: "DMs et profils Instagram",
    icon: <Instagram className="h-4 w-4" />,
  },
  {
    id: "WHATSAPP",
    name: "WhatsApp",
    description: "Messages WhatsApp Business",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    id: "GOOGLE",
    name: "Google Calendar",
    description: "Synchronisation de calendrier",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    id: "TELEGRAM",
    name: "Telegram",
    description: "Messages Telegram",
    icon: <Send className="h-4 w-4" />,
  },
  {
    id: "MAIL",
    name: "Email",
    description: "Emails via IMAP/SMTP",
    icon: <Mail className="h-4 w-4" />,
  },
];

// ---------------------------------------------------------------------------
// API Keys config
// ---------------------------------------------------------------------------

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
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface UnipileAccount {
  id: string;
  provider: string;
  channel: string;
  name: string;
  status: string;
}

interface IntegrationsViewProps {
  initialStatus: Record<string, boolean>;
  unipileStatus: {
    configured: boolean;
    accounts: UnipileAccount[];
  };
}

export function IntegrationsView({
  initialStatus,
  unipileStatus,
}: IntegrationsViewProps) {
  const [status, setStatus] = useState(initialStatus);
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [savingService, setSavingService] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Unipile state
  const [accounts, setAccounts] = useState<UnipileAccount[]>(
    unipileStatus.accounts,
  );
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null,
  );
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
        const newStatus = { ...status };
        for (const k of keysToSave) {
          newStatus[k.key] = true;
        }
        setStatus(newStatus);
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

  // Unipile handlers
  async function handleConnect(providerId: string) {
    setConnectingProvider(providerId);
    try {
      const result = await generateUnipileAuthLink(providerId);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        window.open(
          result.url,
          "_blank",
          "width=600,height=700,scrollbars=yes",
        );
        toast.info(
          "Connectez votre compte dans la fenêtre ouverte, puis cliquez sur Rafraîchir",
        );
      }
    } catch {
      toast.error("Erreur lors de la génération du lien");
    }
    setConnectingProvider(null);
  }

  async function handleDisconnect(accountId: string) {
    setDisconnectingId(accountId);
    try {
      const result = await disconnectUnipileAccount(accountId);
      if (result.success) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
        toast.success("Compte déconnecté");
      } else {
        toast.error(result.error || "Erreur lors de la déconnexion");
      }
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
    setDisconnectingId(null);
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const result = await getUnipileStatus();
      setAccounts(result.accounts);
      toast.success(
        `${result.accounts.length} compte${result.accounts.length > 1 ? "s" : ""} détecté${result.accounts.length > 1 ? "s" : ""}`,
      );
    } catch {
      toast.error("Erreur lors du rafraîchissement");
    }
    setRefreshing(false);
  }

  function getProviderIcon(provider: string) {
    const p = provider.toUpperCase();
    if (p === "LINKEDIN") return <Linkedin className="h-4 w-4" />;
    if (p === "INSTAGRAM") return <Instagram className="h-4 w-4" />;
    if (p === "WHATSAPP") return <MessageCircle className="h-4 w-4" />;
    if (p === "GOOGLE") return <Calendar className="h-4 w-4" />;
    if (p === "TELEGRAM") return <Send className="h-4 w-4" />;
    if (p === "MAIL") return <Mail className="h-4 w-4" />;
    return <Unplug className="h-4 w-4" />;
  }

  const connectedProviders = new Set(
    accounts.map((a) => a.provider.toUpperCase()),
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* ================================================================= */}
      {/* UNIPILE — Comptes connectés                                       */}
      {/* ================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Comptes connectés (Unipile)
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Rafraîchir
          </Button>
        </div>

        {!unipileStatus.configured && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                  <Unplug className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Unipile non configuré</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ajoutez les variables{" "}
                    <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                      UNIPILE_DSN
                    </code>{" "}
                    et{" "}
                    <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                      UNIPILE_API_KEY
                    </code>{" "}
                    dans votre fichier .env.local pour activer les intégrations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {unipileStatus.configured && (
          <>
            {/* Connected accounts */}
            {accounts.length > 0 && (
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background">
                          {getProviderIcon(account.provider)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {account.provider}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-brand/15 text-brand border-brand/20 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connecté
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive"
                          onClick={() => handleDisconnect(account.id)}
                          disabled={disconnectingId === account.id}
                        >
                          {disconnectingId === account.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Connect new accounts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Connecter un compte</CardTitle>
                <CardDescription className="text-xs">
                  Votre client se connecte directement — aucune clé API à
                  configurer manuellement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {UNIPILE_PROVIDERS.map((provider) => {
                    const isConnected = connectedProviders.has(provider.id);
                    const isConnecting = connectingProvider === provider.id;

                    return (
                      <button
                        key={provider.id}
                        onClick={() => handleConnect(provider.id)}
                        disabled={isConnecting}
                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-center ${
                          isConnected
                            ? "border-brand/30 bg-brand/5"
                            : "border-border hover:border-foreground/20 hover:bg-muted/50"
                        }`}
                      >
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            isConnected ? "bg-brand/15" : "bg-muted"
                          }`}
                        >
                          {isConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isConnected ? (
                            <CheckCircle2 className="h-4 w-4 text-brand" />
                          ) : (
                            provider.icon
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-medium">{provider.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                            {isConnected ? "Connecté" : provider.description}
                          </p>
                        </div>
                        {!isConnected && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Plus className="h-3 w-3" />
                            Connecter
                          </div>
                        )}
                        {isConnected && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ExternalLink className="h-3 w-3" />
                            Reconnecter
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* API Keys — Services individuels                                   */}
      {/* ================================================================= */}
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
                        <CardTitle className="text-base">
                          {service.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {service.description}
                        </CardDescription>
                      </div>
                    </div>
                    {configured ? (
                      <Badge className="bg-brand/15 text-brand border-brand/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connecté
                      </Badge>
                    ) : partial ? (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground border-muted-foreground/30"
                      >
                        Partiel
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
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
                          <span className="ml-2 text-brand text-[10px]">
                            (configuré)
                          </span>
                        )}
                      </Label>
                      <div className="relative">
                        <Input
                          type={visible[k.key] ? "text" : "password"}
                          value={values[k.key] || ""}
                          onChange={(e) =>
                            handleValueChange(k.key, e.target.value)
                          }
                          placeholder={
                            status[k.key] ? "••••••••••••••••" : k.placeholder
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
            Les comptes Unipile sont connectés en un clic — pas besoin de clés
            API individuelles pour LinkedIn, Instagram, WhatsApp ou Google
            Calendar. Les clés API ci-dessous servent de fallback ou pour les
            services non couverts par Unipile.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
