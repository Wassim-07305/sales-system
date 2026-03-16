import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-brand-dark">
          Connexion
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {"Entrez vos identifiants pour accéder à votre espace."}
        </p>
      </div>
      <LoginForm />
    </>
  );
}
