import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-brand-dark">
          Nouveau mot de passe
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Entrez votre nouveau mot de passe ci-dessous.
        </p>
      </div>
      <ResetPasswordForm />
    </>
  );
}
