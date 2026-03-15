import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
        <p className="text-muted-foreground mt-2">
          {"Entrez vos identifiants pour acc\u00e9der \u00e0 votre espace."}
        </p>
      </div>
      <LoginForm />
    </>
  );
}
