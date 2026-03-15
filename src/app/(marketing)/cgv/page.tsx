import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Conditions G\u00e9n\u00e9rales de Vente \u2014 Setting Academy",
  description: "Conditions g\u00e9n\u00e9rales de vente de Setting Academy.",
};

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-white">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="size-4" />
          Retour
        </Link>

        <h1 className="font-serif text-3xl font-bold">Conditions G&eacute;n&eacute;rales de Vente</h1>
        <p className="mt-4 text-sm text-white/50">
          Derni&egrave;re mise &agrave; jour : mars 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-white/60">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 1 &mdash; Objet</h2>
            <p>
              Les pr&eacute;sentes conditions g&eacute;n&eacute;rales de vente r&eacute;gissent les relations contractuelles
              entre Setting Academy SAS et tout utilisateur souscrivant &agrave; un abonnement sur la plateforme
              settingacademy.com.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 2 &mdash; Services propos&eacute;s</h2>
            <p>
              Setting Academy propose une plateforme SaaS de formation et de gestion commerciale
              incluant : modules de formation, CRM int&eacute;gr&eacute;, messagerie centralis&eacute;e,
              outils IA, communaut&eacute; et scripts de vente.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 3 &mdash; Tarifs et paiement</h2>
            <p>
              Les tarifs sont indiqu&eacute;s en euros TTC sur la page de tarification.
              Le paiement s&apos;effectue mensuellement par carte bancaire via notre prestataire
              de paiement s&eacute;curis&eacute;. Tout mois entam&eacute; est d&ucirc;.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 4 &mdash; Droit de r&eacute;tractation</h2>
            <p>
              Conform&eacute;ment &agrave; l&apos;article L221-28 du Code de la consommation,
              le droit de r&eacute;tractation ne s&apos;applique pas aux contenus num&eacute;riques
              fournis sur un support immat&eacute;riel dont l&apos;ex&eacute;cution a commenc&eacute;
              avec l&apos;accord du consommateur.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 5 &mdash; R&eacute;siliation</h2>
            <p>
              L&apos;utilisateur peut r&eacute;silier son abonnement &agrave; tout moment depuis
              les param&egrave;tres de son compte. La r&eacute;siliation prend effet &agrave; la fin
              de la p&eacute;riode de facturation en cours. Aucun remboursement au prorata n&apos;est
              pr&eacute;vu.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 6 &mdash; Responsabilit&eacute;</h2>
            <p>
              Setting Academy s&apos;engage &agrave; fournir un acc&egrave;s continu &agrave; la plateforme
              dans la mesure du possible. Setting Academy ne saurait &ecirc;tre tenu responsable
              des dommages indirects li&eacute;s &agrave; l&apos;utilisation du service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Article 7 &mdash; Droit applicable</h2>
            <p>
              Les pr&eacute;sentes CGV sont soumises au droit fran&ccedil;ais. En cas de litige,
              les tribunaux de Paris seront seuls comp&eacute;tents.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
