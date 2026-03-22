"use client";

import { Briefcase, DollarSign, CheckSquare, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileDashboardWidgetProps {
  dealsEnCours: number;
  caDuMois: number;
  tachesDuJour: number;
  prochainsRdv: number;
}

const formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function MobileDashboardWidget({
  dealsEnCours,
  caDuMois,
  tachesDuJour,
  prochainsRdv,
}: MobileDashboardWidgetProps) {
  const items = [
    {
      label: "Deals en cours",
      value: String(dealsEnCours),
      icon: Briefcase,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "CA du mois",
      value: formatter.format(caDuMois),
      icon: DollarSign,
      color: "text-[#10b981]",
      bg: "bg-[#10b981]/10",
    },
    {
      label: "Tâches du jour",
      value: String(tachesDuJour),
      icon: CheckSquare,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
    {
      label: "Prochains RDV",
      value: String(prochainsRdv),
      icon: Calendar,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
  ];

  return (
    <div className="block md:hidden -mx-4 px-4 pb-4">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex-shrink-0 w-[140px] rounded-xl border border-border bg-card p-3 space-y-2",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    item.bg,
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", item.color)} />
                </div>
              </div>
              <div>
                <p className="text-lg font-bold text-foreground leading-tight">
                  {item.value}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {item.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
