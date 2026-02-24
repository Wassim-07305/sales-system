"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Check,
  ArrowLeft,
  Sparkles,
  Building2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
  currentTier: string;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "0",
    description: "Pour commencer",
    icon: Zap,
    features: [
      "Accès au CRM de base",
      "Gestion des contacts",
      "5 scripts de vente",
      "Communauté",
      "1 utilisateur",
    ],
    cta: "Plan actuel",
    ctaDisabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "49",
    description: "Pour les professionnels",
    icon: Sparkles,
    popular: true,
    features: [
      "Tout le plan Free",
      "Scripts illimités",
      "Roleplay IA avancé",
      "Analytics détaillées",
      "Automatisations",
      "Intégration WhatsApp",
      "Support prioritaire",
      "5 utilisateurs",
    ],
    cta: "Passer à Pro",
    ctaDisabled: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sur devis",
    description: "Pour les équipes",
    icon: Building2,
    features: [
      "Tout le plan Pro",
      "White label complet",
      "API dédiée",
      "SSO / SAML",
      "SLA garanti",
      "Manager dédié",
      "Utilisateurs illimités",
      "Formations personnalisées",
    ],
    cta: "Contacter les ventes",
    ctaDisabled: false,
  },
];

const COMPARISON_FEATURES = [
  { name: "CRM & Pipeline", free: true, pro: true, enterprise: true },
  { name: "Gestion des contacts", free: true, pro: true, enterprise: true },
  { name: "Scripts de vente", free: "5", pro: "Illimité", enterprise: "Illimité" },
  { name: "Communauté", free: true, pro: true, enterprise: true },
  { name: "Roleplay IA", free: "Basique", pro: "Avancé", enterprise: "Avancé" },
  { name: "Analytics", free: "Basiques", pro: "Détaillées", enterprise: "Détaillées" },
  { name: "Automatisations", free: false, pro: true, enterprise: true },
  { name: "Intégration WhatsApp", free: false, pro: true, enterprise: true },
  { name: "White label", free: false, pro: false, enterprise: true },
  { name: "API dédiée", free: false, pro: false, enterprise: true },
  { name: "SSO / SAML", free: false, pro: false, enterprise: true },
  { name: "Support", free: "Email", pro: "Prioritaire", enterprise: "Dédié" },
  { name: "Utilisateurs", free: "1", pro: "5", enterprise: "Illimité" },
];

export function SubscriptionView({ currentTier }: Props) {
  function handleUpgrade(planId: string) {
    if (planId === "enterprise") {
      toast.info("Bientôt disponible — Notre équipe vous contactera prochainement.");
    } else {
      toast.info("Bientôt disponible — La souscription sera disponible prochainement.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Abonnement"
        description="Gérez votre plan d'abonnement"
      >
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Paramètres
          </Button>
        </Link>
      </PageHeader>

      {/* Current plan card */}
      <Card className="mb-8 bg-gradient-to-r from-brand-dark to-brand-dark/80 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-brand/20 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-brand" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Plan actuel</p>
              <h2 className="text-xl font-bold capitalize">
                {currentTier === "free"
                  ? "Free"
                  : currentTier === "pro"
                    ? "Pro"
                    : "Enterprise"}
              </h2>
            </div>
            <Badge className="ml-auto bg-brand text-brand-dark">Actif</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentTier;
          const Icon = plan.icon;

          return (
            <Card
              key={plan.id}
              className={cn(
                "relative",
                plan.popular && "border-brand ring-2 ring-brand/20",
                isCurrent && "bg-muted/30"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-brand text-brand-dark">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Populaire
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-6 w-6 text-brand" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
                <div className="mt-3">
                  {plan.price === "Sur devis" ? (
                    <span className="text-2xl font-bold">Sur devis</span>
                  ) : (
                    <div>
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">&euro;/mois</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isCurrent || plan.ctaDisabled}
                  className={cn(
                    "w-full",
                    isCurrent
                      ? "bg-muted text-muted-foreground"
                      : plan.popular
                        ? "bg-brand text-brand-dark hover:bg-brand/90"
                        : ""
                  )}
                  variant={isCurrent || plan.popular ? "default" : "outline"}
                >
                  {isCurrent ? "Plan actuel" : plan.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature comparison table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparaison des plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium">
                    Fonctionnalité
                  </th>
                  <th className="text-center py-3 px-4 font-medium">Free</th>
                  <th className="text-center py-3 px-4 font-medium">Pro</th>
                  <th className="text-center py-3 px-4 font-medium">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((feature) => (
                  <tr key={feature.name} className="border-b last:border-0">
                    <td className="py-3 pr-4">{feature.name}</td>
                    {["free", "pro", "enterprise"].map((tier) => {
                      const val = feature[tier as keyof typeof feature];
                      return (
                        <td key={tier} className="text-center py-3 px-4">
                          {val === true ? (
                            <Check className="h-4 w-4 text-brand mx-auto" />
                          ) : val === false ? (
                            <span className="text-muted-foreground">&mdash;</span>
                          ) : (
                            <span className="text-xs">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
