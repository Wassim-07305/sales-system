import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-brand-dark">
          {"Créer un compte"}
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Remplissez les informations ci-dessous pour commencer.
        </p>
      </div>
      <RegisterForm />
    </>
  );
}
