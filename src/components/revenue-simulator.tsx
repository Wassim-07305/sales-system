"use client";

import { useState, useMemo, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calculator,
  MessageSquare,
  Phone,
  UserCheck,
  HandCoins,
  TrendingUp,
  Save,
  Euro,
} from "lucide-react";
import {
  saveSimulatorInputs,
  type SimulatorInputs,
  type SimulatorResults,
} from "@/lib/actions/simulator";
import { toast } from "sonner";

function calculateRevenueLocal(inputs: SimulatorInputs): SimulatorResults {
  const monthlyConversations = inputs.dailyConversations * inputs.workingDaysPerMonth;
  const monthlyBookedCalls = Math.round(monthlyConversations * (inputs.conversionRate / 100));
  const monthlyShowUps = Math.round(monthlyBookedCalls * (inputs.showUpRate / 100));
  const monthlyClosedDeals = Math.round(monthlyShowUps * (inputs.closingRate / 100));
  const monthlyGrossRevenue = monthlyClosedDeals * inputs.averageDealValue;
  const monthlySetterCommission = Math.round(monthlyGrossRevenue * (inputs.commissionRate / 100));
  const yearlySetterCommission = monthlySetterCommission * 12;

  const funnel = [
    { label: "Conversations/mois", value: monthlyConversations, percent: 100 },
    {
      label: "Appels bookes",
      value: monthlyBookedCalls,
      percent: monthlyConversations > 0 ? Math.round((monthlyBookedCalls / monthlyConversations) * 100) : 0,
    },
    {
      label: "Show-ups",
      value: monthlyShowUps,
      percent: monthlyConversations > 0 ? Math.round((monthlyShowUps / monthlyConversations) * 100) : 0,
    },
    {
      label: "Deals closes",
      value: monthlyClosedDeals,
      percent: monthlyConversations > 0 ? Math.round((monthlyClosedDeals / monthlyConversations) * 100) : 0,
    },
  ];

  return {
    monthlyConversations,
    monthlyBookedCalls,
    monthlyShowUps,
    monthlyClosedDeals,
    monthlyGrossRevenue,
    monthlySetterCommission,
    yearlySetterCommission,
    funnel,
  };
}

const DEFAULT_INPUTS: SimulatorInputs = {
  dailyConversations: 20,
  conversionRate: 15,
  showUpRate: 70,
  closingRate: 25,
  averageDealValue: 2000,
  workingDaysPerMonth: 22,
  commissionRate: 10,
};

export function RevenueSimulator({
  savedInputs,
}: {
  savedInputs?: SimulatorInputs | null;
}) {
  const [inputs, setInputs] = useState<SimulatorInputs>(
    savedInputs || DEFAULT_INPUTS
  );
  const [isPending, startTransition] = useTransition();

  const results = useMemo(() => calculateRevenueLocal(inputs), [inputs]);

  function update(field: keyof SimulatorInputs, value: string) {
    const num = Number(value);
    if (isNaN(num) || num < 0) return;
    setInputs((prev) => ({ ...prev, [field]: num }));
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveSimulatorInputs(inputs);
        toast.success("Parametres sauvegardes !");
      } catch {
        toast.error("Erreur lors de la sauvegarde.");
      }
    });
  }

  const funnelColors = ["bg-blue-500", "bg-yellow-500", "bg-orange-500", "bg-green-500"];
  const maxFunnel = results.funnel[0]?.value || 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-4 w-4 text-brand" />
              Tes parametres
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Conversations/jour
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={200}
                  value={inputs.dailyConversations}
                  onChange={(e) => update("dailyConversations", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1.5">
                  <Phone className="h-3 w-3" />
                  Taux booking (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.conversionRate}
                  onChange={(e) => update("conversionRate", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1.5">
                  <UserCheck className="h-3 w-3" />
                  Taux show-up (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.showUpRate}
                  onChange={(e) => update("showUpRate", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1.5">
                  <HandCoins className="h-3 w-3" />
                  Taux closing (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.closingRate}
                  onChange={(e) => update("closingRate", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1.5">
                  <Euro className="h-3 w-3" />
                  Valeur moy. deal
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={inputs.averageDealValue}
                  onChange={(e) => update("averageDealValue", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1 mb-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Commission (%)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={inputs.commissionRate}
                  onChange={(e) => update("commissionRate", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">
                Jours de travail/mois
              </Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={inputs.workingDaysPerMonth}
                onChange={(e) => update("workingDaysPerMonth", e.target.value)}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={isPending}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Save className="h-3.5 w-3.5 mr-2" />
              {isPending ? "Sauvegarde..." : "Sauvegarder mes parametres"}
            </Button>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Revenue highlight */}
          <Card className="bg-gradient-to-br from-brand/20 to-brand/5 border-brand/20">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-1">Tes revenus mensuels estimes</p>
              <p className="text-4xl font-bold text-brand">
                {results.monthlySetterCommission.toLocaleString("fr-FR")} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                soit {results.yearlySetterCommission.toLocaleString("fr-FR")} €/an
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                <div className="bg-background/60 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">CA genere/mois</p>
                  <p className="font-semibold">
                    {results.monthlyGrossRevenue.toLocaleString("fr-FR")} €
                  </p>
                </div>
                <div className="bg-background/60 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground">Deals closes/mois</p>
                  <p className="font-semibold">{results.monthlyClosedDeals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Funnel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ton funnel mensuel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.funnel.map((step, i) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs">{step.label}</span>
                    <span className="text-xs font-semibold">{step.value}</span>
                  </div>
                  <div className="relative h-6 rounded bg-muted overflow-hidden">
                    <div
                      className={`absolute left-0 top-0 h-full rounded transition-all duration-500 ${funnelColors[i]}`}
                      style={{
                        width: `${Math.max((step.value / maxFunnel) * 100, 2)}%`,
                      }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white mix-blend-difference">
                      {step.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
