import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-brand-dark items-center justify-center p-12">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(122,241,122,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(122,241,122,0.05)_0%,_transparent_60%)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand/10 to-transparent" />

        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-sm">
            <Image
              src="/logo.png"
              alt="Sales System"
              width={56}
              height={56}
              className="drop-shadow-lg"
            />
          </div>
          <h1 className="font-serif text-5xl font-bold text-white mb-4 tracking-tight">
            Sales<span className="text-brand">System</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            La plateforme tout-en-un pour structurer et scaler votre acquisition commerciale.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-3 text-left">
            {[
              "CRM & Pipeline",
              "Formation & Academy",
              "Booking & Calendrier",
              "Analytics & KPIs",
              "Chat temps r\u00e9el",
              "Gamification",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 text-white/70 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                {feature}
              </div>
            ))}
          </div>
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-white/40 text-xs">
              {"Utilis\u00e9 par plus de 500 commerciaux en France"}
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[420px] animate-in fade-in duration-500">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-dark/5 ring-1 ring-brand-dark/10">
              <Image
                src="/logo.png"
                alt="Sales System"
                width={36}
                height={36}
              />
            </div>
            <h1 className="font-serif text-3xl font-bold tracking-tight">
              Sales<span className="text-brand">System</span>
            </h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
