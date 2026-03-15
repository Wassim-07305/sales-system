import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Mentions l\u00e9gales \u2014 Setting Academy",
  description: "Mentions l\u00e9gales de Setting Academy.",
};

export default function MentionsLegalesPage() {
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

        <h1 className="font-serif text-3xl font-bold">Mentions l&eacute;gales</h1>
        <p className="mt-4 text-sm text-white/50">
          Derni&egrave;re mise &agrave; jour : mars 2026
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-white/60">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">&Eacute;diteur du site</h2>
            <p>
              Le site Setting Academy est &eacute;dit&eacute; par la soci&eacute;t&eacute; Setting Academy SAS,
              au capital social de 10 000 &euro; euros, immatricul&eacute;e au RCS de Paris
              sous le num&eacute;ro RCS Paris B 000 000 000.
            </p>
            <p className="mt-2">
              Si&egrave;ge social : &Agrave; compl&eacute;ter<br />
              Num&eacute;ro de TVA intracommunautaire : FR 00 000000000<br />
              Directeur de la publication : Damien Reynaud
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">H&eacute;bergement</h2>
            <p>
              Le site est h&eacute;berg&eacute; par Vercel Inc., 340 S Lemon Ave #4133,
              Walnut, CA 91789, &Eacute;tats-Unis.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Propri&eacute;t&eacute; intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu du site (textes, images, vid&eacute;os, logos, ic&ocirc;nes)
              est prot&eacute;g&eacute; par le droit d&apos;auteur et la propri&eacute;t&eacute; intellectuelle.
              Toute reproduction, m&ecirc;me partielle, est interdite sans autorisation pr&eacute;alable.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Contact</h2>
            <p>
              Pour toute question concernant les mentions l&eacute;gales, vous pouvez nous contacter
              &agrave; l&apos;adresse : contact@settingacademy.com
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
