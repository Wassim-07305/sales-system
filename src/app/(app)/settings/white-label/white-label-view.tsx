"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Palette, Globe, Image, Eye, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import { saveWhiteLabelConfig } from "@/lib/actions/white-label";
import Link from "next/link";

interface WhiteLabelConfig {
  id: string;
  entrepreneur_id: string;
  brand_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  enabled_modules: string[];
  is_active: boolean;
  created_at: string;
}

export function WhiteLabelView({ config }: { config: WhiteLabelConfig }) {
  const [isPending, startTransition] = useTransition();
  const [brandName, setBrandName] = useState(config?.brand_name || "");
  const [logoUrl, setLogoUrl] = useState(config?.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(
    config?.primary_color || "#7af17a"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    config?.secondary_color || "#14080e"
  );
  const [customDomain, setCustomDomain] = useState(
    config?.custom_domain || ""
  );
  const [isActive, setIsActive] = useState(config?.is_active || false);

  function handleSave() {
    startTransition(async () => {
      const result = await saveWhiteLabelConfig({
        brandName,
        logoUrl: logoUrl || undefined,
        primaryColor,
        secondaryColor,
        customDomain: customDomain || undefined,
        isActive,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configuration sauvegardée");
      }
    });
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="White Label"
        description="Personnalisez l'apparence de votre plateforme"
      >
        <Link href="/settings/white-label/permissions">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </Button>
        </Link>
      </PageHeader>

      {/* Active Toggle */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Activer le White Label</p>
              <p className="text-xs text-muted-foreground">
                Activez la personnalisation pour vos setters et clients
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </CardContent>
      </Card>

      {/* Brand Settings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Identité de marque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nom de la marque</Label>
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Votre marque"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              URL du logo
            </Label>
            <Input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://exemple.com/logo.png"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Utilisez une URL publique pour votre logo (PNG ou SVG recommandé)
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#7af17a"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Couleur secondaire</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#14080e"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domaine personnalisé
            </Label>
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.votremarque.com"
            />
            <p className="text-xs text-muted-foreground">
              Configurez un CNAME vers notre serveur pour activer votre domaine
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Aperçu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg p-6 border"
            style={{ backgroundColor: secondaryColor }}
          >
            <div className="flex items-center gap-3 mb-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-10 w-10 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="h-10 w-10 rounded flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: primaryColor }}
                >
                  {brandName ? brandName.charAt(0).toUpperCase() : "W"}
                </div>
              )}
              <span className="text-white font-semibold text-lg">
                {brandName || "Votre Marque"}
              </span>
            </div>
            <div className="flex gap-3">
              <div
                className="rounded-md px-4 py-2 text-sm font-medium"
                style={{
                  backgroundColor: primaryColor,
                  color: secondaryColor,
                }}
              >
                Bouton principal
              </div>
              <div
                className="rounded-md px-4 py-2 text-sm font-medium border"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor,
                }}
              >
                Bouton secondaire
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Dashboard", "CRM", "Academy"].map((mod) => (
                <div
                  key={mod}
                  className="rounded-md p-3 text-center text-xs font-medium"
                  style={{
                    backgroundColor: `${primaryColor}20`,
                    color: primaryColor,
                  }}
                >
                  {mod}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Sauvegarde..." : "Sauvegarder la configuration"}
        </Button>
      </div>
    </div>
  );
}
