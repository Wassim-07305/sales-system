"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DollarSign,
  BarChart3,
  Percent,
  PieChart,
  Globe,
  Clock,
  Save,
  Loader2,
  LayoutDashboard,
} from "lucide-react";
import { saveDashboardWidgets } from "@/lib/actions/dashboard-builder";

interface Widget {
  id?: string;
  user_id?: string;
  type: string;
  position: number;
  config: Record<string, unknown>;
  created_at?: string;
}

const WIDGET_TYPES = [
  {
    type: "revenue_month",
    title: "CA du Mois",
    description: "Chiffre d'affaires du mois en cours",
    icon: DollarSign,
  },
  {
    type: "deals_count",
    title: "Nombre de Deals",
    description: "Total des deals crees ce mois",
    icon: BarChart3,
  },
  {
    type: "conversion_rate",
    title: "Taux de Conversion",
    description: "Pourcentage de deals signes",
    icon: Percent,
  },
  {
    type: "pipeline_value",
    title: "Valeur Pipeline",
    description: "Valeur totale des deals en cours",
    icon: PieChart,
  },
  {
    type: "top_sources",
    title: "Top Sources",
    description: "Sources les plus performantes",
    icon: Globe,
  },
  {
    type: "recent_deals",
    title: "Deals Recents",
    description: "Derniers deals crees",
    icon: Clock,
  },
];

export function BuilderView({
  initialWidgets,
}: {
  initialWidgets: Widget[];
}) {
  const initialTypes = new Set(initialWidgets.map((w) => w.type));
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(initialTypes);
  const [isPending, startTransition] = useTransition();

  function toggleWidget(type: string) {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  function handleSave() {
    const widgets = WIDGET_TYPES.filter((w) => enabledTypes.has(w.type)).map(
      (w, index) => ({
        type: w.type,
        position: index,
        config: {},
      })
    );

    startTransition(async () => {
      try {
        await saveDashboardWidgets(widgets);
        toast.success("Dashboard sauvegarde avec succes");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erreur lors de la sauvegarde"
        );
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Personnaliser le Dashboard"
        description="Choisissez les widgets a afficher sur votre tableau de bord"
      >
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Sauvegarder
        </Button>
      </PageHeader>

      {/* Widget selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {WIDGET_TYPES.map((widget) => {
          const Icon = widget.icon;
          const isEnabled = enabledTypes.has(widget.type);

          return (
            <Card
              key={widget.type}
              className={`cursor-pointer transition-all duration-200 border-border/50 ${isEnabled ? "border-brand ring-1 ring-brand/20 hover:shadow-md" : "opacity-70 hover:opacity-90"}`}
              onClick={() => toggleWidget(widget.type)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ring-1 ${isEnabled ? "bg-brand/10 text-brand ring-brand/20" : "bg-muted text-muted-foreground ring-border/50"}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{widget.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {widget.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleWidget(widget.type)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
              <LayoutDashboard className="h-4 w-4 text-blue-500" />
            </div>
            Apercu du Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enabledTypes.size === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <LayoutDashboard className="h-7 w-7 opacity-50" />
              </div>
              <p className="font-medium">Aucun widget selectionne</p>
              <p className="text-sm mt-1">
                Activez des widgets ci-dessus pour les voir apparaitre ici.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {WIDGET_TYPES.filter((w) => enabledTypes.has(w.type)).map(
                (widget) => {
                  const Icon = widget.icon;
                  return (
                    <div
                      key={widget.type}
                      className="rounded-xl border border-dashed border-border/50 p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                        <Icon className="h-4 w-4 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{widget.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Widget actif
                        </p>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
