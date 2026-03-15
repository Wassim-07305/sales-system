import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setting Academy — La plateforme tout-en-un pour les equipes de vente",
  description:
    "Formation, CRM, prospection IA et management d'equipe. Remplacez 10 outils par un seul. Rejoignez +200 setters et +50 entreprises.",
  openGraph: {
    title: "Setting Academy — La plateforme tout-en-un pour les equipes de vente",
    description:
      "Formation, CRM integre, IA et communaute. Rejoignez des centaines de setters qui performent avec Setting Academy.",
    type: "website",
    locale: "fr_FR",
    siteName: "Setting Academy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Setting Academy — La plateforme tout-en-un pour les equipes de vente",
    description:
      "Formation, CRM, prospection IA et management d'equipe. Remplacez 10 outils par un seul.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`html { scroll-behavior: smooth; }`}</style>
      {children}
    </>
  );
}
