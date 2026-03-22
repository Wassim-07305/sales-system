import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#09090b]">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#050505] items-center justify-center p-12">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.1)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(16,185,129,0.06)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.02)_0%,_transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent" />
        {/* Decorative floating orbs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-emerald-500/3 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-md text-center">
          <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 backdrop-blur-md shadow-2xl shadow-emerald-500/10">
            <Image
              src="/logo.png"
              alt="Sales System"
              width={56}
              height={56}
              className="drop-shadow-lg"
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Sales<span className="text-emerald-400">System</span>
          </h1>
          <p className="text-zinc-500 text-lg leading-relaxed max-w-sm mx-auto">
            La plateforme tout-en-un pour structurer et scaler votre acquisition
            commerciale.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-4 text-left">
            {[
              "CRM & Pipeline",
              "Formation & Academy",
              "Booking & Calendrier",
              "Analytics & KPIs",
              "Chat temps réel",
              "Gamification",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 text-zinc-500 text-sm group"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-shadow duration-300" />
                <span className="group-hover:text-zinc-300 transition-colors duration-200">
                  {feature}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-16 pt-8 border-t border-white/[0.06]">
            <p className="text-zinc-700 text-xs tracking-wide">
              {"Utilisé par plus de 500 commerciaux en France"}
            </p>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-8 relative bg-[#09090b]">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,_rgba(16,185,129,0.04)_0%,_transparent_50%)]" />
        <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/[0.08] shadow-sm">
              <Image
                src="/logo.png"
                alt="Sales System"
                width={40}
                height={40}
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Sales<span className="text-emerald-400">System</span>
            </h1>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
