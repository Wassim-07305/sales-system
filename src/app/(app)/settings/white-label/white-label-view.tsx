"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Palette,
  Globe,
  Image,
  Eye,
  Save,
  Shield,
  LayoutDashboard,
  Kanban,
  GraduationCap,
  Search,
  Theater,
  FileText,
  MessageCircle,
  BarChart3,
  MessagesSquare,
  Users,
  Trophy,
  ScrollText,
  AppWindow,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  updateWhiteLabelConfig,
  updateFeatureToggles,
} from "@/lib/actions/white-label";
import Link from "next/link";

interface WhiteLabelConfig {
  id: string;
  entrepreneur_id: string;
  brand_name: string | null;
  app_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  custom_domain: string | null;
  enabled_modules: string[];
  is_active: boolean;
  created_at: string;
}

interface ModuleInfo {
  key: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const MODULES: ModuleInfo[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    description: "Tableau de bord et KPIs",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    key: "crm",
    name: "CRM",
    description: "Pipeline et deals",
    icon: <Kanban className="h-4 w-4" />,
  },
  {
    key: "academy",
    name: "Academy",
    description: "Formation et cours",
    icon: <GraduationCap className="h-4 w-4" />,
  },
  {
    key: "prospection",
    name: "Prospection",
    description: "Prospects et campagnes",
    icon: <Search className="h-4 w-4" />,
  },
  {
    key: "roleplay",
    name: "Role-Play",
    description: "Simulations de vente",
    icon: <Theater className="h-4 w-4" />,
  },
  {
    key: "scripts",
    name: "Scripts",
    description: "Scripts et flowcharts",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Intégration WhatsApp",
    icon: <MessageCircle className="h-4 w-4" />,
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Analyses et rapports",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    key: "chat",
    name: "Chat",
    description: "Messagerie interne",
    icon: <MessagesSquare className="h-4 w-4" />,
  },
  {
    key: "communaute",
    name: "Communaute",
    description: "Espace communautaire",
    icon: <Users className="h-4 w-4" />,
  },
  {
    key: "defis",
    name: "Defis",
    description: "Challenges et classements",
    icon: <Trophy className="h-4 w-4" />,
  },
  {
    key: "contrats",
    name: "Contrats",
    description: "Gestion des contrats",
    icon: <ScrollText className="h-4 w-4" />,
  },
];

export function WhiteLabelView({ config }: { config: WhiteLabelConfig }) {
  const [isPending, startTransition] = useTransition();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [brandName, setBrandName] = useState(config?.brand_name || "");
  const [appName, setAppName] = useState(config?.app_name || "");
  const [logoUrl, setLogoUrl] = useState(config?.logo_url || "");
  const [primaryColor, setPrimaryColor] = useState(
    config?.primary_color || "#7af17a",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    config?.secondary_color || "#14080e",
  );
  const [customDomain, setCustomDomain] = useState(config?.custom_domain || "");
  const [isActive, setIsActive] = useState(config?.is_active || false);
  const [enabledModules, setEnabledModules] = useState<string[]>(
    config?.enabled_modules || MODULES.map((m) => m.key),
  );

  function handleSave() {
    startTransition(async () => {
      const result = await updateWhiteLabelConfig({
        brandName,
        appName: appName || undefined,
        logoUrl: logoUrl || undefined,
        primaryColor,
        secondaryColor,
        customDomain: customDomain || undefined,
        isActive,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Configuration sauvegardee");
      }
    });
  }

  function toggleModule(key: string) {
    const updated = enabledModules.includes(key)
      ? enabledModules.filter((m) => m !== key)
      : [...enabledModules, key];
    setEnabledModules(updated);
  }

  function handleSaveToggles() {
    startToggleTransition(async () => {
      const result = await updateFeatureToggles(enabledModules);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Fonctionnalités mises à jour");
      }
    });
  }

  const displayName = appName || brandName || "Votre Marque";

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="White Label"
        description="Personnalisez l'apparence de votre plateforme pour vos clients B2B"
      >
        <Link href="/settings/white-label/permissions">
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </Button>
        </Link>
      </PageHeader>

      {/* Active Toggle */}
      <Card className="mb-6 border-border/50">
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
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center ring-1 ring-purple-500/20">
              <Palette className="h-4 w-4 text-purple-500" />
            </div>
            Identite de marque
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nom de la marque</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Votre marque"
              />
              <p className="text-xs text-muted-foreground">
                Le nom commercial affiche dans l&apos;interface
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <AppWindow className="h-4 w-4" />
                Nom de l&apos;application
              </Label>
              <Input
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Mon App Sales"
              />
              <p className="text-xs text-muted-foreground">
                Nom affiche dans l&apos;onglet navigateur et le header
              </p>
            </div>
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
              Utilisez une URL publique pour votre logo (PNG ou SVG recommande,
              200x200px minimum)
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
              Domaine personnalise
            </Label>
            <Input
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="app.votremarque.com"
            />
            <p className="text-xs text-muted-foreground">
              Configurez un CNAME vers notre serveur pour activer votre domaine
              personnalise
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
              <ToggleRight className="h-4 w-4 text-brand" />
            </div>
            Fonctionnalités actives
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choisissez les modules visibles pour les utilisateurs de ce
            workspace
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MODULES.map((mod) => (
              <div
                key={mod.key}
                className="flex items-center justify-between gap-2 rounded-xl border border-border/50 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground shrink-0">
                    {mod.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{mod.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {mod.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabledModules.includes(mod.key)}
                  onCheckedChange={() => toggleModule(mod.key)}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {enabledModules.length} module
              {enabledModules.length > 1 ? "s" : ""} active
              {enabledModules.length > 1 ? "s" : ""}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveToggles}
              disabled={isTogglePending}
            >
              <Save className="h-4 w-4 mr-2" />
              {isTogglePending ? "Sauvegarde..." : "Enregistrer les modules"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="mb-6 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
              <Eye className="h-4 w-4 text-blue-500" />
            </div>
            Apercu en temps reel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="rounded-lg overflow-hidden border"
            style={{ backgroundColor: secondaryColor }}
          >
            {/* Simulated header bar */}
            <div
              className="px-4 py-3 flex items-center justify-between border-b"
              style={{ borderColor: `${primaryColor}30` }}
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-8 w-8 rounded object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded flex items-center justify-center text-white font-bold text-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-white font-semibold">{displayName}</span>
              </div>
              {customDomain && (
                <span
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    color: primaryColor,
                    backgroundColor: `${primaryColor}15`,
                  }}
                >
                  {customDomain}
                </span>
              )}
            </div>

            {/* Simulated content */}
            <div className="p-4">
              <div className="flex gap-3 mb-4">
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

              {/* Simulated module cards */}
              <div className="grid grid-cols-4 gap-2">
                {MODULES.filter((m) => enabledModules.includes(m.key))
                  .slice(0, 8)
                  .map((mod) => (
                    <div
                      key={mod.key}
                      className="rounded-md p-2 text-center text-xs font-medium"
                      style={{
                        backgroundColor: `${primaryColor}20`,
                        color: primaryColor,
                      }}
                    >
                      {mod.name}
                    </div>
                  ))}
              </div>

              {enabledModules.length === 0 && (
                <p
                  className="text-xs text-center py-4"
                  style={{ color: `${primaryColor}60` }}
                >
                  Aucun module active
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save All */}
      <div className="flex justify-end gap-3 pb-8">
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Sauvegarde..." : "Sauvegarder la configuration"}
        </Button>
      </div>
    </div>
  );
}
