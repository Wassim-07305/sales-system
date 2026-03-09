import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Bell, Shield, Palette, ChevronRight } from "lucide-react";

export default function SettingsPage() {
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
            <Input defaultValue="Sales System" />
          </div>
          <div className="space-y-2">
            <Label>Email de contact</Label>
            <Input defaultValue="damien@salessystem.fr" />
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
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Rappels de booking</p>
              <p className="text-xs text-muted-foreground">
                Envoyer des rappels avant chaque RDV
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertes customer success</p>
              <p className="text-xs text-muted-foreground">
                Alerter quand un client passe en zone rouge
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

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
            <Input type="password" placeholder="Nouveau mot de passe" />
          </div>
          <Button variant="outline">Mettre à jour le mot de passe</Button>
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
