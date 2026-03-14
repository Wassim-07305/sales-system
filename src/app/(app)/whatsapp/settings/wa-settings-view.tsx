"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Wifi,
  WifiOff,
  Clock,
  Phone,
  QrCode,
  Copy,
  Check,
  ArrowLeft,
  Link2,
  Webhook,
} from "lucide-react";
import { connectWhatsApp, disconnectWhatsApp } from "@/lib/actions/whatsapp";
import { saveApiKey, deleteApiKey } from "@/lib/api-keys";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

interface WhatsAppConnection {
  id: string;
  phone_number: string | null;
  status: "connected" | "disconnected" | "pending";
  api_config: Record<string, unknown>;
  connected_at: string | null;
}

interface IntegrationKeys {
  ghl_api_key?: string | null;
  iclosed_api_key?: string | null;
}

const statusConfig = {
  connected: {
    label: "Connecté",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Wifi,
  },
  disconnected: {
    label: "Déconnecté",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: WifiOff,
  },
  pending: {
    label: "En attente",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock,
  },
};

export function WaSettingsView({
  connection,
  integrationKeys,
}: {
  connection: WhatsAppConnection | null;
  integrationKeys?: IntegrationKeys;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phoneNumber, setPhoneNumber] = useState(
    connection?.phone_number || ""
  );
  const [copied, setCopied] = useState(false);
  const [ghlEnabled, setGhlEnabled] = useState(!!integrationKeys?.ghl_api_key);
  const [iClosedEnabled, setIClosedEnabled] = useState(!!integrationKeys?.iclosed_api_key);
  const [ghlKey, setGhlKey] = useState(integrationKeys?.ghl_api_key || "");
  const [iClosedKey, setIClosedKey] = useState(integrationKeys?.iclosed_api_key || "");
  const [ghlSaved, setGhlSaved] = useState(!!integrationKeys?.ghl_api_key);
  const [iClosedSaved, setIClosedSaved] = useState(!!integrationKeys?.iclosed_api_key);

  const status = connection?.status || "disconnected";
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/whatsapp`
      : "/api/webhooks/whatsapp";

  async function handleConnect() {
    if (!phoneNumber.trim()) {
      toast.error("Veuillez entrer un numéro de téléphone");
      return;
    }
    startTransition(async () => {
      try {
        await connectWhatsApp(phoneNumber);
        toast.success("Demande de connexion envoyée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la connexion");
      }
    });
  }

  async function handleDisconnect() {
    startTransition(async () => {
      try {
        await disconnectWhatsApp();
        toast.success("WhatsApp déconnecté");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la déconnexion");
      }
    });
  }

  function handleCopyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL copiée");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveGhlKey() {
    if (!ghlKey.trim()) {
      toast.error("Veuillez entrer une clé API");
      return;
    }
    startTransition(async () => {
      const result = await saveApiKey("GHL_API_KEY", ghlKey.trim());
      if (result.success) {
        setGhlSaved(true);
        toast.success("Clé API GoHighLevel enregistrée");
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    });
  }

  async function handleDisconnectGhl() {
    startTransition(async () => {
      await deleteApiKey("GHL_API_KEY");
      setGhlEnabled(false);
      setGhlKey("");
      setGhlSaved(false);
      toast.success("GoHighLevel déconnecté");
    });
  }

  async function handleSaveIClosedKey() {
    if (!iClosedKey.trim()) {
      toast.error("Veuillez entrer une clé API");
      return;
    }
    startTransition(async () => {
      const result = await saveApiKey("ICLOSED_API_KEY", iClosedKey.trim());
      if (result.success) {
        setIClosedSaved(true);
        toast.success("Clé API iClosed enregistrée");
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    });
  }

  async function handleDisconnectIClosed() {
    startTransition(async () => {
      await deleteApiKey("ICLOSED_API_KEY");
      setIClosedEnabled(false);
      setIClosedKey("");
      setIClosedSaved(false);
      toast.success("iClosed déconnecté");
    });
  }

  return (
    <div>
      <PageHeader
        title="Paramètres WhatsApp"
        description="Configuration de la connexion WhatsApp"
      >
        <Link href="/whatsapp">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <div className="grid gap-6 max-w-2xl">
        {/* Connection Card */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg ring-1 ring-blue-500/20 bg-blue-500/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-blue-600" />
              </div>
              Connexion WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code Placeholder */}
            <div className="flex justify-center">
              <div className="w-48 h-48 bg-muted rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30">
                <QrCode className="h-12 w-12 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground text-center px-4">
                  Scanner le QR code
                </p>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Statut</span>
              <Badge variant="outline" className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>

            {connection?.connected_at && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Connecté depuis</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(connection.connected_at).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              </div>
            )}

            <Separator />

            {/* Phone number input */}
            <div>
              <Label>Numéro de téléphone</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format international avec indicatif pays
              </p>
            </div>

            {/* Connect / Disconnect buttons */}
            {status === "connected" || status === "pending" ? (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={isPending}
                className="w-full"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Déconnecter
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                disabled={isPending}
                className="w-full bg-brand text-brand-dark hover:bg-brand/90"
              >
                <Wifi className="h-4 w-4 mr-2" />
                Connecter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Integrations Card */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg ring-1 ring-purple-500/20 bg-purple-500/10 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-purple-600" />
              </div>
              Intégrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GHL Integration */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">GoHighLevel (GHL)</p>
                  {ghlSaved && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      <Check className="h-3 w-3 mr-0.5" />
                      Connecté
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Synchroniser les contacts et conversations avec GHL
                </p>
              </div>
              <Switch
                checked={ghlEnabled}
                onCheckedChange={(checked) => {
                  setGhlEnabled(checked);
                  if (!checked && ghlSaved) handleDisconnectGhl();
                }}
              />
            </div>
            {ghlEnabled && (
              <div className="space-y-2">
                <Label className="text-xs">Clé API GHL</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={ghlKey}
                    onChange={(e) => { setGhlKey(e.target.value); setGhlSaved(false); }}
                    placeholder="ghl_xxxxxxxxxxxx"
                    className="mt-1 h-8 font-mono text-xs"
                    type="password"
                  />
                  <Button
                    size="sm"
                    variant={ghlSaved ? "outline" : "default"}
                    onClick={handleSaveGhlKey}
                    disabled={isPending || ghlSaved}
                    className="shrink-0 h-8"
                  >
                    {ghlSaved ? <Check className="h-4 w-4" /> : "Enregistrer"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  La synchronisation complète sera disponible prochainement. Votre clé est enregistrée en toute sécurité.
                </p>
              </div>
            )}

            <Separator />

            {/* iClosed Integration */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">iClosed</p>
                  {iClosedSaved && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                      <Check className="h-3 w-3 mr-0.5" />
                      Connecté
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connecter les données de closing avec iClosed
                </p>
              </div>
              <Switch
                checked={iClosedEnabled}
                onCheckedChange={(checked) => {
                  setIClosedEnabled(checked);
                  if (!checked && iClosedSaved) handleDisconnectIClosed();
                }}
              />
            </div>
            {iClosedEnabled && (
              <div className="space-y-2">
                <Label className="text-xs">Clé API iClosed</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={iClosedKey}
                    onChange={(e) => { setIClosedKey(e.target.value); setIClosedSaved(false); }}
                    placeholder="ic_xxxxxxxxxxxx"
                    className="mt-1 h-8 font-mono text-xs"
                    type="password"
                  />
                  <Button
                    size="sm"
                    variant={iClosedSaved ? "outline" : "default"}
                    onClick={handleSaveIClosedKey}
                    disabled={isPending || iClosedSaved}
                    className="shrink-0 h-8"
                  >
                    {iClosedSaved ? <Check className="h-4 w-4" /> : "Enregistrer"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  La synchronisation complète sera disponible prochainement. Votre clé est enregistrée en toute sécurité.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks Card */}
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg ring-1 ring-amber-500/20 bg-amber-500/10 flex items-center justify-center">
                <Webhook className="h-4 w-4 text-amber-600" />
              </div>
              Webhooks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>URL du Webhook</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Utilisez cette URL pour recevoir les messages entrants
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhook}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
