import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-dark items-center justify-center p-12">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-5xl font-bold text-white mb-4">
            Sales<span className="text-brand">System</span>
          </h1>
          <p className="text-white/70 text-lg">
            Rejoignez la communauté Sales System et structurez votre acquisition.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="font-serif text-3xl font-bold">
              Sales<span className="text-brand">System</span>
            </h1>
          </div>
          <h2 className="text-2xl font-bold mb-2">Créer un compte</h2>
          <p className="text-muted-foreground mb-8">
            Remplissez les informations ci-dessous pour commencer.
          </p>
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
