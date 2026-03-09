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
  Key,
  Webhook,
} from "lucide-react";
import { connectWhatsApp, disconnectWhatsApp } from "@/lib/actions/whatsapp";
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

const statusConfig = {
  connected: {
    label: "Connecté",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: Wifi,
  },
  disconnected: {
    label: "Déconnecté",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: WifiOff,
  },
  pending: {
    label: "En attente",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
};

export function WaSettingsView({
  connection,
}: {
  connection: WhatsAppConnection | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [phoneNumber, setPhoneNumber] = useState(
    connection?.phone_number || ""
  );
  const [copied, setCopied] = useState(false);
  const [ghlEnabled, setGhlEnabled] = useState(false);
  const [iClosedEnabled, setIClosedEnabled] = useState(false);

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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
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
              <span className="text-sm font-medium">Statut</span>
              <Badge variant="outline" className={statusInfo.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
            </div>

            {connection?.connected_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Connecté depuis</span>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Intégrations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* GHL Integration */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">GoHighLevel (GHL)</p>
                <p className="text-xs text-muted-foreground">
                  Synchroniser les contacts et conversations avec GHL
                </p>
              </div>
              <Switch
                checked={ghlEnabled}
                onCheckedChange={setGhlEnabled}
              />
            </div>
            {ghlEnabled && (
              <div>
                <Label className="text-xs">Clé API GHL</Label>
                <Input
                  disabled
                  placeholder="Intégration bientôt disponible"
                  className="mt-1 h-8"
                />
              </div>
            )}

            <Separator />

            {/* iClosed Integration */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">iClosed</p>
                <p className="text-xs text-muted-foreground">
                  Connecter les données de closing avec iClosed
                </p>
              </div>
              <Switch
                checked={iClosedEnabled}
                onCheckedChange={setIClosedEnabled}
              />
            </div>
            {iClosedEnabled && (
              <div>
                <Label className="text-xs">Clé API iClosed</Label>
                <Input
                  disabled
                  placeholder="Intégration bientôt disponible"
                  className="mt-1 h-8"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
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
