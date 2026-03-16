import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Politique de confidentialit\u00e9 \u2014 Sales System",
  description:
    "Politique de confidentialit\u00e9 et protection des donn\u00e9es personnelles de Sales System.",
};

export default function ConfidentialitePage() {
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

        <h1 className="font-serif text-3xl font-bold">
          Politique de confidentialit&eacute;
        </h1>
        <p className="mt-4 text-sm text-white/50">
          Derni&egrave;re mise &agrave; jour : mars 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-white/60">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              1. Responsable du traitement
            </h2>
            <p>
              Le responsable du traitement des donn&eacute;es est Setting
              Academy SAS, repr&eacute;sent&eacute;e par Damien Reynaud,
              joignable &agrave; contact@salessystem.fr.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              2. Donn&eacute;es collect&eacute;es
            </h2>
            <p>Nous collectons les donn&eacute;es suivantes :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Donn&eacute;es d&apos;identification : nom, pr&eacute;nom,
                adresse email
              </li>
              <li>
                Donn&eacute;es d&apos;utilisation : progression dans les
                modules, activit&eacute; CRM
              </li>
              <li>
                Donn&eacute;es techniques : adresse IP, type de navigateur,
                appareil utilis&eacute;
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              3. Finalit&eacute;s du traitement
            </h2>
            <p>Vos donn&eacute;es sont utilis&eacute;es pour :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Fournir et am&eacute;liorer nos services</li>
              <li>G&eacute;rer votre compte utilisateur</li>
              <li>Envoyer des notifications li&eacute;es au service</li>
              <li>Assurer la s&eacute;curit&eacute; de la plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              4. Base l&eacute;gale
            </h2>
            <p>
              Le traitement de vos donn&eacute;es est fond&eacute; sur
              l&apos;ex&eacute;cution du contrat (votre abonnement) et votre
              consentement pour les communications marketing.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              5. Dur&eacute;e de conservation
            </h2>
            <p>
              Vos donn&eacute;es sont conserv&eacute;es pendant la dur&eacute;e
              de votre abonnement et 3 ans apr&egrave;s la suppression de votre
              compte, conform&eacute;ment aux obligations l&eacute;gales.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              6. Vos droits (RGPD)
            </h2>
            <p>
              Conform&eacute;ment au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Droit d&apos;acc&egrave;s &agrave; vos donn&eacute;es</li>
              <li>Droit de rectification</li>
              <li>
                Droit &agrave; l&apos;effacement (&laquo;&nbsp;droit &agrave;
                l&apos;oubli&nbsp;&raquo;)
              </li>
              <li>Droit &agrave; la portabilit&eacute;</li>
              <li>Droit d&apos;opposition</li>
              <li>Droit de retirer votre consentement</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous &agrave;
              contact@salessystem.fr.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              7. Sous-traitants
            </h2>
            <p>Nous faisons appel aux sous-traitants suivants :</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Supabase (base de donn&eacute;es et authentification)</li>
              <li>Vercel (h&eacute;bergement)</li>
              <li>Unipile (int&eacute;gration messagerie)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              8. Cookies
            </h2>
            <p>
              Le site utilise uniquement des cookies techniques
              n&eacute;cessaires au fonctionnement du service (authentification,
              pr&eacute;f&eacute;rences de session). Aucun cookie publicitaire
              ou de tra&ccedil;age n&apos;est utilis&eacute;.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              9. R&eacute;clamation
            </h2>
            <p>
              Vous pouvez introduire une r&eacute;clamation aupr&egrave;s de la
              CNIL (Commission Nationale de l&apos;Informatique et des
              Libert&eacute;s) si vous estimez que le traitement de vos
              donn&eacute;es n&apos;est pas conforme au RGPD.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
