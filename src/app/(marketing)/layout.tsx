import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setting Academy — Devenez un Setter d'Élite",
  description:
    "La plateforme tout-en-un pour maîtriser le setting, décrocher des missions et closer plus de deals. Formation, CRM, IA et communauté.",
  openGraph: {
    title: "Setting Academy — Devenez un Setter d'Élite",
    description:
      "Formation, CRM intégré, IA et communauté. Rejoignez des centaines de setters qui performent avec Setting Academy.",
    type: "website",
    locale: "fr_FR",
    siteName: "Setting Academy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Setting Academy — Devenez un Setter d'Élite",
    description:
      "La plateforme tout-en-un pour maîtriser le setting et closer plus de deals.",
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
