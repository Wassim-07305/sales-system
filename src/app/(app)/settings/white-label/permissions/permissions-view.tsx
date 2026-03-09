"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
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
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { updatePermissions } from "@/lib/actions/white-label";

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
    description: "Tableau de bord principal avec KPIs et statistiques",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    key: "crm",
    name: "CRM",
    description: "Gestion des deals, pipeline et contacts",
    icon: <Kanban className="h-5 w-5" />,
  },
  {
    key: "academy",
    name: "Academy",
    description: "Formation, cours et quiz pour les setters",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    key: "prospection",
    name: "Prospection",
    description: "Gestion des prospects et campagnes de DM",
    icon: <Search className="h-5 w-5" />,
  },
  {
    key: "roleplay",
    name: "Role-Play",
    description: "Simulations de vente avec feedback IA",
    icon: <Theater className="h-5 w-5" />,
  },
  {
    key: "scripts",
    name: "Scripts",
    description: "Scripts de vente, flowcharts et mindmaps",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    description: "Intégration WhatsApp et séquences automatisées",
    icon: <MessageCircle className="h-5 w-5" />,
  },
  {
    key: "analytics",
    name: "Analytics",
    description: "Analyses avancées et rapports détaillés",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    key: "chat",
    name: "Chat",
    description: "Messagerie interne et canaux de discussion",
    icon: <MessagesSquare className="h-5 w-5" />,
  },
  {
    key: "communaute",
    name: "Communauté",
    description: "Espace communautaire, posts et interactions",
    icon: <Users className="h-5 w-5" />,
  },
  {
    key: "defis",
    name: "Défis",
    description: "Challenges gamifiés et classements",
    icon: <Trophy className="h-5 w-5" />,
  },
  {
    key: "contrats",
    name: "Contrats",
    description: "Génération et signature de contrats",
    icon: <ScrollText className="h-5 w-5" />,
  },
];

export function PermissionsView({
  permissions,
}: {
  permissions: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [enabledModules, setEnabledModules] = useState<string[]>(
    permissions || []
  );

  function toggleModule(key: string) {
    setEnabledModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updatePermissions(enabledModules);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Permissions mises à jour");
      }
    });
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Permissions par Module"
        description="Contrôlez l'accès aux fonctionnalités"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {MODULES.map((mod) => (
          <Card key={mod.key}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5 text-muted-foreground">{mod.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{mod.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mod.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabledModules.includes(mod.key)}
                  onCheckedChange={() => toggleModule(mod.key)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {enabledModules.length} module{enabledModules.length > 1 ? "s" : ""}{" "}
          activé{enabledModules.length > 1 ? "s" : ""}
        </p>
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="h-4 w-4 mr-2" />
          {isPending ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>
    </div>
  );
}
