import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-brand-dark">{"Mot de passe oubli\u00e9"}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {"Entrez votre email pour recevoir un lien de r\u00e9initialisation."}
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  );
}
