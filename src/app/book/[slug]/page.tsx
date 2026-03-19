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

  return <BookingForm slug={slug} pageConfig={page} />;
}
