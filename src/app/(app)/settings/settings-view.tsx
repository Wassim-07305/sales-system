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
import { Settings, Bell, Shield, ChevronRight, Loader2, Check } from "lucide-react";
import { saveOrgSettings, changePassword } from "@/lib/actions/settings";
import { toast } from "sonner";

interface OrgSettings {
  org_name: string;
  contact_email: string;
  email_notifications: boolean;
  booking_reminders: boolean;
  cs_alerts: boolean;
}

export function SettingsView({ initialSettings }: { initialSettings: OrgSettings }) {
  const [orgName, setOrgName] = useState(initialSettings.org_name);
  const [contactEmail, setContactEmail] = useState(initialSettings.contact_email);
  const [emailNotifications, setEmailNotifications] = useState(initialSettings.email_notifications);
  const [bookingReminders, setBookingReminders] = useState(initialSettings.booking_reminders);
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
    <div className="max-w-2xl">
      <PageHeader
        title="Paramètres"
        description="Configuration générale de l'application"
      />

      {/* General */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
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
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifications email</p>
              <p className="text-xs text-muted-foreground">
                Recevoir les notifications par email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Rappels de booking</p>
              <p className="text-xs text-muted-foreground">
                Envoyer des rappels avant chaque RDV
              </p>
            </div>
            <Switch
              checked={bookingReminders}
              onCheckedChange={setBookingReminders}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertes customer success</p>
              <p className="text-xs text-muted-foreground">
                Alerter quand un client passe en zone rouge
              </p>
            </div>
            <Switch
              checked={csAlerts}
              onCheckedChange={setCsAlerts}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="mb-8">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-brand text-brand-dark hover:bg-brand/90"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Sauvegarder les paramètres
        </Button>
      </div>

      {/* Security */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Changer le mot de passe</Label>
            <Input
              type="password"
              placeholder="Nouveau mot de passe (min. 8 caractères)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={handleChangePassword}
            disabled={isChangingPwd || !newPassword}
          >
            {isChangingPwd ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Mettre à jour le mot de passe
          </Button>
        </CardContent>
      </Card>

      {/* RGPD / Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Confidentialité & RGPD
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Gérez vos consentements, exportez vos données et exercez vos droits RGPD.
          </p>
          <Link href="/settings/privacy">
            <Button variant="outline" className="w-full justify-between">
              Accéder aux paramètres de confidentialité
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
