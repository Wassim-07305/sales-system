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
    name: "Carte cadeau 50\u00a0\u20ac",
    description:
      "Une carte cadeau de 50\u00a0\u20ac utilisable chez nos partenaires.",
    pointsCost: 500,
    icon: "CreditCard",
  },
  {
    id: "journee_off",
    name: "Journ\u00e9e off bonus",
    description:
      "Une journ\u00e9e de cong\u00e9 suppl\u00e9mentaire \u00e0 utiliser quand vous le souhaitez.",
    pointsCost: 1000,
    icon: "Calendar",
  },
  {
    id: "diner_equipe",
    name: "D\u00eener \u00e9quipe",
    description:
      "Un d\u00eener d\u2019\u00e9quipe offert dans le restaurant de votre choix.",
    pointsCost: 2000,
    icon: "Gift",
  },
  {
    id: "formation_premium",
    name: "Formation premium",
    description:
      "Acc\u00e8s \u00e0 une formation premium de votre choix (valeur 500\u00a0\u20ac).",
    pointsCost: 3000,
    icon: "GraduationCap",
  },
  {
    id: "bonus_500",
    name: "Bonus 500\u00a0\u20ac",
    description:
      "Un bonus de 500\u00a0\u20ac ajout\u00e9 \u00e0 votre prochaine paie.",
    pointsCost: 5000,
    icon: "Banknote",
  },
];
