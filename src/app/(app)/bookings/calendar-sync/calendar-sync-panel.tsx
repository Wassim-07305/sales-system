"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Info,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Copy,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type {
  CalendarSyncStatus,
  CalendarSettings,
} from "@/lib/actions/calendar-sync";
import {
  syncCalendarEvents,
  saveCalendarSettings,
  disconnectGoogleCalendar,
} from "@/lib/actions/calendar-sync";

interface CalendarSyncPanelProps {
  initialStatus: CalendarSyncStatus;
  initialSettings: CalendarSettings;
}

export function CalendarSyncPanel({
  initialStatus,
  initialSettings,
}: CalendarSyncPanelProps) {
  const [status, setStatus] = useState<CalendarSyncStatus>(initialStatus);
  const [settings, setSettings] = useState<CalendarSettings>(initialSettings);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [isSyncing, startSyncTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isDisconnecting, startDisconnectTransition] = useTransition();

  function handleSync() {
    startSyncTransition(async () => {
      const result = await syncCalendarEvents();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleSaveSettings() {
    startSaveTransition(async () => {
      const result = await saveCalendarSettings(settings);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function handleConnectGoogle() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setShowSetupGuide(true);
      toast.error("Configuration Google Calendar requise. Suivez le guide ci-dessous.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/google`;
    const scope = encodeURIComponent(
      "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email"
    );
    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    window.location.href = authUrl;
  }

  function handleDisconnect() {
    startDisconnectTransition(async () => {
      const result = await disconnectGoogleCalendar();
      if (result.success) {
        toast.success(result.message);
        setStatus({
          connected: false,
          lastSyncAt: null,
          syncedEventsCount: 0,
          googleEmail: null,
        });
      } else {
        toast.error(result.message);
      }
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copie dans le presse-papiers");
  }

  const syncDirectionLabels = {
    bidirectional: "Bidirectionnel",
    export_only: "Export uniquement",
    import_only: "Import uniquement",
  };

  const syncDirectionIcons = {
    bidirectional: <ArrowLeftRight className="h-4 w-4" />,
    export_only: <ArrowRight className="h-4 w-4" />,
    import_only: <ArrowLeft className="h-4 w-4" />,
  };

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <Link
        href="/bookings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux bookings
      </Link>

      {/* Connection status card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Statut de connexion
          </CardTitle>
          <CardDescription>
            Connectez votre compte Google pour synchroniser automatiquement vos
            rendez-vous avec Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status.connected ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Connecte
                    </p>
                    {status.googleEmail && (
                      <p className="text-sm text-muted-foreground">
                        {status.googleEmail}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Non connecte</p>
                    <p className="text-sm text-muted-foreground">
                      Google Calendar n&apos;est pas encore configure
                    </p>
                  </div>
                </>
              )}
            </div>
            <Badge variant={status.connected ? "default" : "outline"}>
              {status.connected ? "Actif" : "Inactif"}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          {status.connected ? (
            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Déconnexion..." : "Déconnecter"}
            </Button>
          ) : (
            <Button onClick={handleConnectGoogle}>
              <Calendar className="h-4 w-4 mr-2" />
              Connecter Google Calendar
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Setup guide */}
      {showSetupGuide && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Configuration requise
            </CardTitle>
            <CardDescription>
              Suivez ces etapes pour activer la synchronisation Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-semibold text-sm">
                Etape 1 : Creer un projet Google Cloud
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Rendez-vous sur{" "}
                  <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                    console.cloud.google.com
                  </span>
                </li>
                <li>Creez un nouveau projet ou selectionnez un projet existant</li>
                <li>
                  Activez l&apos;API Google Calendar dans{" "}
                  <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                    APIs &amp; Services &gt; Library
                  </span>
                </li>
              </ol>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-semibold text-sm">
                Etape 2 : Configurer OAuth 2.0
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Allez dans{" "}
                  <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                    APIs &amp; Services &gt; Credentials
                  </span>
                </li>
                <li>
                  Cliquez sur{" "}
                  <span className="font-semibold text-foreground">
                    Create Credentials &gt; OAuth client ID
                  </span>
                </li>
                <li>
                  Type d&apos;application :{" "}
                  <span className="font-semibold text-foreground">
                    Web application
                  </span>
                </li>
                <li>
                  Ajoutez l&apos;URI de redirection :{" "}
                  <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/auth/callback/google`
                      : "https://votre-domaine.com/api/auth/callback/google"}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-1 h-6 w-6 p-0"
                    onClick={() =>
                      copyToClipboard(
                        typeof window !== "undefined"
                          ? `${window.location.origin}/api/auth/callback/google`
                          : ""
                      )
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </li>
              </ol>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-semibold text-sm">
                Etape 3 : Ajouter les variables d&apos;environnement
              </h4>
              <p className="text-sm text-muted-foreground">
                Ajoutez les variables suivantes dans votre fichier{" "}
                <span className="font-mono text-xs bg-background px-1 py-0.5 rounded">
                  .env.local
                </span>{" "}
                :
              </p>
              <div className="bg-background rounded border p-3 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span>
                    <span className="text-blue-600 dark:text-blue-400">
                      NEXT_PUBLIC_GOOGLE_CLIENT_ID
                    </span>
                    =votre_client_id
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() =>
                      copyToClipboard("NEXT_PUBLIC_GOOGLE_CLIENT_ID=")
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span>
                    <span className="text-blue-600 dark:text-blue-400">
                      GOOGLE_CLIENT_SECRET
                    </span>
                    =votre_client_secret
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() =>
                      copyToClipboard("GOOGLE_CLIENT_SECRET=")
                    }
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4 space-y-3">
              <h4 className="font-semibold text-sm">
                Etape 4 : Redemarrer l&apos;application
              </h4>
              <p className="text-sm text-muted-foreground">
                Apres avoir ajoute les variables d&apos;environnement, redemarrez
                le serveur de developpement avec{" "}
                <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border">
                  npm run dev
                </span>{" "}
                puis revenez sur cette page.
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Une fois les identifiants configures, le bouton &laquo; Connecter
                Google Calendar &raquo; lancera le flux OAuth pour autoriser
                l&apos;acces a votre calendrier.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Parametres de synchronisation
          </CardTitle>
          <CardDescription>
            Configurez le comportement de la synchronisation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync" className="text-sm font-medium">
                Synchronisation automatique
              </Label>
              <p className="text-xs text-muted-foreground">
                Synchroniser automatiquement lors de la creation ou modification
                d&apos;un rendez-vous
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={settings.autoSyncEnabled}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, autoSyncEnabled: checked }))
              }
              disabled={!status.connected}
            />
          </div>

          <Separator />

          {/* Sync direction */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Direction de synchronisation
            </Label>
            <p className="text-xs text-muted-foreground">
              Choisissez comment les evenements sont synchronises entre
              l&apos;application et Google Calendar
            </p>
            <Select
              value={settings.syncDirection}
              onValueChange={(value) =>
                setSettings((s) => ({
                  ...s,
                  syncDirection: value as CalendarSettings["syncDirection"],
                }))
              }
              disabled={!status.connected}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bidirectional">
                  <span className="flex items-center gap-2">
                    {syncDirectionIcons.bidirectional}
                    {syncDirectionLabels.bidirectional}
                  </span>
                </SelectItem>
                <SelectItem value="export_only">
                  <span className="flex items-center gap-2">
                    {syncDirectionIcons.export_only}
                    {syncDirectionLabels.export_only}
                  </span>
                </SelectItem>
                <SelectItem value="import_only">
                  <span className="flex items-center gap-2">
                    {syncDirectionIcons.import_only}
                    {syncDirectionLabels.import_only}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Default calendar info */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Calendrier par defaut</Label>
            <p className="text-xs text-muted-foreground">
              {status.connected
                ? "Selectionnez le calendrier Google dans lequel creer les evenements"
                : "Connectez votre compte Google pour voir vos calendriers disponibles"}
            </p>
            <Select
              value={settings.defaultCalendarId || "primary"}
              onValueChange={(value) =>
                setSettings((s) => ({ ...s, defaultCalendarId: value }))
              }
              disabled={!status.connected}
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Calendrier principal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Calendrier principal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSaveSettings}
            disabled={isSaving || !status.connected}
            variant="outline"
          >
            {isSaving ? "Enregistrement..." : "Enregistrer les parametres"}
          </Button>
        </CardFooter>
      </Card>

      {/* Sync history & manual sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Historique de synchronisation
          </CardTitle>
          <CardDescription>
            Derniere synchronisation et statistiques
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">
                {status.syncedEventsCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Evenements synchronises
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">
                {status.lastSyncAt
                  ? new Date(status.lastSyncAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Derniere synchronisation
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-2xl font-bold">
                {settings.syncDirection === "bidirectional"
                  ? "Bidirectionnel"
                  : settings.syncDirection === "export_only"
                    ? "Export"
                    : "Import"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Mode de synchronisation
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleSync}
            disabled={isSyncing || !status.connected}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Synchronisation..." : "Synchroniser maintenant"}
          </Button>
          {!status.connected && (
            <p className="text-xs text-muted-foreground ml-3">
              Connectez Google Calendar pour activer la synchronisation
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
