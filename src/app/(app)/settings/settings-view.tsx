"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Settings,
  Bell,
  Shield,
  ChevronRight,
  Loader2,
  Check,
  Plug,
} from "lucide-react";
import { saveOrgSettings, changePassword } from "@/lib/actions/settings";
import { toast } from "sonner";

interface OrgSettings {
  org_name: string;
  contact_email: string;
  email_notifications: boolean;
  booking_reminders: boolean;
  cs_alerts: boolean;
}

export function SettingsView({
  initialSettings,
}: {
  initialSettings: OrgSettings;
}) {
  const [orgName, setOrgName] = useState(initialSettings.org_name);
  const [contactEmail, setContactEmail] = useState(
    initialSettings.contact_email,
  );
  const [emailNotifications, setEmailNotifications] = useState(
    initialSettings.email_notifications,
  );
  const [bookingReminders, setBookingReminders] = useState(
    initialSettings.booking_reminders,
  );
  const [csAlerts, setCsAlerts] = useState(initialSettings.cs_alerts);
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, startSaving] = useTransition();
  const [isChangingPwd, startChangingPwd] = useTransition();

  function handleSave() {
    startSaving(async () => {
      const result = await saveOrgSettings({
        org_name: orgName,
        contact_email: contactEmail,
        email_notifications: emailNotifications,
        booking_reminders: bookingReminders,
        cs_alerts: csAlerts,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Paramètres sauvegardés");
      }
    });
  }

  function handleChangePassword() {
    if (!newPassword) return;
    startChangingPwd(async () => {
      const result = await changePassword(newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Mot de passe mis à jour");
        setNewPassword("");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Configuration générale de l'application"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* General */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <Settings className="h-4 w-4 text-brand" />
              </div>
              Général
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l&apos;organisation</Label>
              <Input
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Nom de votre organisation"
              />
            </div>
            <div className="space-y-2">
              <Label>Email de contact</Label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Bell className="h-4 w-4 text-blue-500" />
              </div>
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium">Notifications email</p>
                <p className="text-xs text-muted-foreground">
                  Recevoir par email
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium">Rappels de booking</p>
                <p className="text-xs text-muted-foreground">
                  Rappels avant chaque RDV
                </p>
              </div>
              <Switch
                checked={bookingReminders}
                onCheckedChange={setBookingReminders}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-muted/30 transition-colors">
              <div>
                <p className="text-sm font-medium">Alertes customer success</p>
                <p className="text-xs text-muted-foreground">
                  Client en zone rouge
                </p>
              </div>
              <Switch checked={csAlerts} onCheckedChange={setCsAlerts} />
            </div>
          </CardContent>
        </Card>

        {/* Intégrations */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center ring-1 ring-green-500/20">
                <Plug className="h-4 w-4 text-green-500" />
              </div>
              Intégrations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez LinkedIn, Instagram, WhatsApp, Email et configurez les
              clés API externes.
            </p>
            <Link href="/settings/integrations">
              <Button variant="outline" className="w-full justify-between">
                Gérer les intégrations
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Sécurité — Mot de passe */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <Shield className="h-4 w-4 text-amber-500" />
              </div>
              Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Changer le mot de passe</Label>
              <Input
                type="password"
                placeholder="Nouveau mot de passe (min. 8 car.)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleChangePassword}
              disabled={isChangingPwd || !newPassword}
            >
              {isChangingPwd ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Mettre à jour le mot de passe
            </Button>
            <Separator />
            <Link href="/settings/security">
              <Button variant="outline" className="w-full justify-between">
                Sécurité & 2FA
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Confidentialité & RGPD */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
                <Shield className="h-4 w-4 text-purple-500" />
              </div>
              Confidentialité & RGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Gérez vos consentements, exportez vos données et exercez vos
              droits RGPD.
            </p>
            <Link href="/settings/privacy">
              <Button variant="outline" className="w-full justify-between">
                Paramètres de confidentialité
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
