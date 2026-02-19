import { BookingForm } from "./booking-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">
            Sales<span className="text-brand">System</span>
          </h1>
          <p className="text-white/70">
            Réservez votre appel découverte
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <BookingForm slug={slug} />
        </div>
      </div>
    </div>
  );
}
