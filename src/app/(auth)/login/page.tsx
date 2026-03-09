import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark items-center justify-center p-12">
        <div className="max-w-md text-center">
          <Image
            src="/logo.png"
            alt="Sales System"
            width={80}
            height={80}
            className="mx-auto mb-6"
          />
          <h1 className="font-serif text-5xl font-bold text-white mb-4">
            Sales<span className="text-brand">System</span>
          </h1>
          <p className="text-white/70 text-lg">
            La plateforme tout-en-un pour structurer et scaler votre acquisition commerciale.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 text-left">
            {[
              "CRM & Pipeline",
              "Formation & Academy",
              "Booking & Calendrier",
              "Analytics & KPIs",
              "Chat temps réel",
              "Gamification",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-white/80 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Image
              src="/logo.png"
              alt="Sales System"
              width={48}
              height={48}
              className="mx-auto mb-3"
            />
            <h1 className="font-serif text-3xl font-bold">
              Sales<span className="text-brand">System</span>
            </h1>
          </div>
          <h2 className="text-2xl font-bold mb-2">Connexion</h2>
          <p className="text-muted-foreground mb-8">
            Entrez vos identifiants pour accéder à votre espace.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
