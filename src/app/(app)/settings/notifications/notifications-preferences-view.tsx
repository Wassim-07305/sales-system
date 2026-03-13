"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Mail,
  Smartphone,
  Handshake,
  CalendarCheck,
  Trophy,
  Users,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateNotificationPreferences,
  sendTestNotification,
} from "@/lib/actions/notifications";
import {
  isPushSupported,
  getPushPermissionStatus,
  requestPushPermission,
  unsubscribePushClient,
} from "@/lib/push-client";

interface Preferences {
  push_enabled: boolean;
  email_enabled: boolean;
  notify_messages: boolean;
  notify_deals: boolean;
  notify_bookings: boolean;
  notify_challenges: boolean;
  notify_community: boolean;
  notify_team: boolean;
}

export function NotificationPreferencesView({
  preferences,
}: {
  preferences: Preferences;
}) {
  const [prefs, setPrefs] = useState<Preferences>(preferences);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [pushStatus, setPushStatus] = useState<
    "supported" | "granted" | "denied" | "default" | "unsupported"
  >("default");

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!isPushSupported()) {
        setPushStatus("unsupported");
      } else {
        const permission = getPushPermissionStatus();
        if (permission === "unsupported") {
          setPushStatus("unsupported");
        } else {
          setPushStatus(permission);
        }
      }
    }
  }, []);

  async function handleToggle(key: keyof Preferences, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);

    setSaving(true);
    const result = await updateNotificationPreferences({ [key]: value });
    setSaving(false);

    if (result.success) {
      toast.success("Préférence mise à jour");
    } else {
      toast.error("Erreur lors de la sauvegarde");
      // Revert
      setPrefs(prefs);
    }
  }

  async function handleEnablePush() {
    const result = await requestPushPermission();
    if (result.success) {
      setPushStatus("granted");
      handleToggle("push_enabled", true);
      toast.success("Notifications push activées");
    } else if (result.permission === "denied") {
      setPushStatus("denied");
      toast.error(
        "Permission refusée. Activez les notifications dans les paramètres de votre navigateur."
      );
    } else if (result.error) {
      toast.error(result.error);
    }
  }

  async function handleDisablePush() {
    await unsubscribePushClient();
    handleToggle("push_enabled", false);
    toast.success("Notifications push désactivées");
  }

  async function handleTestNotification() {
    setTesting(true);
    try {
      const result = await sendTestNotification();
      if (result.success) {
        toast.success("Notification de test envoyée !");
      } else {
        toast.error("Erreur lors de l'envoi de la notification de test");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setTesting(false);
    }
  }

  const pushStatusConfig = {
    granted: {
      icon: CheckCircle,
      label: "Activé",
      variant: "default" as const,
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    },
    denied: {
      icon: XCircle,
      label: "Bloqué par le navigateur",
      variant: "destructive" as const,
      className: "",
    },
    default: {
      icon: AlertCircle,
      label: "Non activé",
      variant: "secondary" as const,
      className: "",
    },
    unsupported: {
      icon: XCircle,
      label: "Non supporté",
      variant: "secondary" as const,
      className: "",
    },
    supported: {
      icon: AlertCircle,
      label: "Disponible",
      variant: "secondary" as const,
      className: "",
    },
  };

  const currentStatus = pushStatusConfig[pushStatus];
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Configurez comment et quand vous souhaitez être notifié"
      />

      {/* Push Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notifications push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status indicator */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              <span className="text-sm">Statut du navigateur</span>
            </div>
            <Badge
              variant={currentStatus.variant}
              className={currentStatus.className}
            >
              {currentStatus.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifications push</p>
              <p className="text-xs text-muted-foreground">
                Recevoir des notifications directement dans votre navigateur
              </p>
            </div>
            {pushStatus === "granted" && prefs.push_enabled ? (
              <Switch
                checked={true}
                onCheckedChange={() => handleDisablePush()}
              />
            ) : pushStatus === "denied" ? (
              <Switch checked={false} disabled />
            ) : (
              <Switch
                checked={false}
                onCheckedChange={() => handleEnablePush()}
              />
            )}
          </div>

          {pushStatus === "denied" && (
            <p className="text-xs text-muted-foreground bg-destructive/10 rounded-lg p-3">
              Les notifications sont bloquées par votre navigateur. Pour les
              réactiver, accédez aux paramètres de votre navigateur et autorisez
              les notifications pour ce site.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notifications email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifications par email</p>
              <p className="text-xs text-muted-foreground">
                Recevoir un résumé des notifications importantes par email
              </p>
            </div>
            <Switch
              checked={prefs.email_enabled}
              onCheckedChange={(checked) =>
                handleToggle("email_enabled", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Types de notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Messages</p>
                <p className="text-xs text-muted-foreground">
                  Nouveaux messages dans l&apos;inbox et le chat
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.notify_messages}
              onCheckedChange={(checked) =>
                handleToggle("notify_messages", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Deals</p>
                <p className="text-xs text-muted-foreground">
                  Nouveaux deals, changements de statut, attributions
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.notify_deals}
              onCheckedChange={(checked) =>
                handleToggle("notify_deals", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Bookings</p>
                <p className="text-xs text-muted-foreground">
                  Rappels de rendez-vous, confirmations, annulations
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.notify_bookings}
              onCheckedChange={(checked) =>
                handleToggle("notify_bookings", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Challenges</p>
                <p className="text-xs text-muted-foreground">
                  Défis, badges, montées de niveau, classements
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.notify_challenges}
              onCheckedChange={(checked) =>
                handleToggle("notify_challenges", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Communauté</p>
                <p className="text-xs text-muted-foreground">
                  Nouveaux messages, mentions, réponses à vos posts
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.notify_community}
              onCheckedChange={(checked) =>
                handleToggle("notify_community", checked)
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Équipe</p>
                <p className="text-xs text-muted-foreground">
                  Activité de l&apos;équipe, objectifs, performances
                </p>
              </div>
            </div>
            <Switch
              checked={prefs.notify_team}
              onCheckedChange={(checked) =>
                handleToggle("notify_team", checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Test Notification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5" />
            Tester les notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Envoyez-vous une notification de test pour vérifier que tout
            fonctionne correctement.
          </p>
          <Button onClick={handleTestNotification} disabled={testing}>
            {testing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Tester les notifications
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {saving && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Sauvegarde en cours...
        </p>
      )}
    </div>
  );
}
