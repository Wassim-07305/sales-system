"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Bell, Lock, CreditCard, Save } from "lucide-react";
import { changePassword } from "@/lib/actions/settings";

interface ClientSettingsViewProps {
  userEmail: string;
}

export function ClientSettingsView({ userEmail }: ClientSettingsViewProps) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, startChangingPassword] = useTransition();

  function handleChangePassword() {
    if (!newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }
    startChangingPassword(async () => {
      const result = await changePassword(newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Mot de passe modifié avec succès !");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="Paramètres" description="Gérez vos préférences et votre compte" />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
          <CardDescription>Gérez comment vous souhaitez être notifié</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifications push</p>
              <p className="text-xs text-muted-foreground">Recevoir des alertes dans le navigateur</p>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notifications email</p>
              <p className="text-xs text-muted-foreground">Recevoir des résumés par email</p>
            </div>
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("Préférences de notification sauvegardées")}
          >
            <Save className="h-3.5 w-3.5 mr-2" />
            Sauvegarder
          </Button>
        </CardContent>
      </Card>

      {/* Compte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Sécurité du compte
          </CardTitle>
          <CardDescription>Modifiez votre mot de passe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userEmail} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Nouveau mot de passe</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmer le mot de passe</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Répétez le nouveau mot de passe"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword || !newPassword}
            size="sm"
          >
            {isChangingPassword ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <Lock className="h-3.5 w-3.5 mr-2" />
            )}
            Changer le mot de passe
          </Button>
        </CardContent>
      </Card>

      {/* Abonnement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-4 w-4" />
            Mon abonnement
          </CardTitle>
          <CardDescription>Informations sur votre plan actuel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">Plan actuel</p>
              <p className="text-sm text-muted-foreground">Accès complet à la plateforme</p>
            </div>
            <Badge className="bg-brand text-brand-dark">Actif</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Pour toute question sur votre abonnement, contactez le support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
