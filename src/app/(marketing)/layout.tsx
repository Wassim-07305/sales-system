import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sales System — La plateforme tout-en-un pour les équipes de vente",
  description:
    "Formation, CRM, prospection IA et management d'équipe. Remplacez 10 outils par un seul. Rejoignez +200 setters et +50 entreprises.",
  openGraph: {
    title: "Sales System — La plateforme tout-en-un pour les équipes de vente",
    description:
      "Formation, CRM intégré, IA et communauté. Rejoignez des centaines de setters qui performent avec Sales System.",
    type: "website",
    locale: "fr_FR",
    siteName: "Sales System",
    images: [
      { url: "/icon-512.png", width: 512, height: 512, alt: "Sales System" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sales System — La plateforme tout-en-un pour les équipes de vente",
    description:
      "Formation, CRM, prospection IA et management d'équipe. Remplacez 10 outils par un seul.",
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
