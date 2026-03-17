export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  icon: string; // lucide icon name
}

export const REWARDS_CATALOG: Reward[] = [
  {
    id: "carte_cadeau_50",
    name: "Carte cadeau 50 \u20ac",
    description:
      "Une carte cadeau de 50 \u20ac utilisable chez nos partenaires.",
    pointsCost: 500,
    icon: "CreditCard",
  },
  {
    id: "journee_off",
    name: "Journée off bonus",
    description:
      "Une journée de congé supplémentaire à utiliser quand vous le souhaitez.",
    pointsCost: 1000,
    icon: "Calendar",
  },
  {
    id: "diner_equipe",
    name: "Dîner équipe",
    description: "Un dîner d’équipe offert dans le restaurant de votre choix.",
    pointsCost: 2000,
    icon: "Gift",
  },
  {
    id: "formation_premium",
    name: "Formation premium",
    description:
      "Accès à une formation premium de votre choix (valeur 500 \u20ac).",
    pointsCost: 3000,
    icon: "GraduationCap",
  },
  {
    id: "bonus_500",
    name: "Bonus 500 \u20ac",
    description: "Un bonus de 500 \u20ac ajouté à votre prochaine paie.",
    pointsCost: 5000,
    icon: "Banknote",
  },
];
