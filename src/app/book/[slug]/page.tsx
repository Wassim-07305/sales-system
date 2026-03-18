import type { Metadata } from "next";
import { BookingForm } from "./booking-form";
import { getPublicBookingPage } from "@/lib/actions/booking-pages";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { page } = await getPublicBookingPage(slug);

  if (!page) {
    return {
      title: "Réserver un créneau — Sales System",
      description:
        "Prenez rendez-vous avec notre équipe pour découvrir Sales System.",
    };
  }

  return {
    title: page.og_title || `${page.title} — Sales System`,
    description:
      page.og_description ||
      page.description ||
      "Prenez rendez-vous avec notre équipe.",
    openGraph: {
      title: page.og_title || page.title,
      description: page.og_description || page.description || undefined,
      images: page.og_image_url ? [page.og_image_url] : undefined,
    },
  };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const { page } = await getPublicBookingPage(slug);

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">
            Sales<span className="text-brand">System</span>
          </h1>
          <p className="text-white/70">
            {page?.description || "Réservez votre appel découverte"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <BookingForm slug={slug} pageConfig={page} />
        </div>

        <p className="text-center mt-6 text-white/30 text-xs">
          Powered by SalesSystem
        </p>
      </div>
    </div>
  );
}
