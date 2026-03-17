"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordStrength = getPasswordStrength(password);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(
          "Une erreur est survenue lors de l'inscription. Veuillez réessayer.",
        );
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
    } catch {
      toast.error(
        "Erreur de connexion au serveur. Vérifiez votre connexion internet.",
      );
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-brand/10 shadow-sm">
          <CheckCircle2 className="h-9 w-9 text-brand" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-brand-dark">
            {"Compte créé avec succès"}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {"Un email de confirmation a été envoyé à"}{" "}
            <strong className="text-foreground">{email}</strong>.
            {" Vérifiez votre boîte de réception pour activer votre compte."}
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border/60 hover:border-brand/50 hover:bg-brand/5 transition-all duration-200"
            onClick={() => router.push("/login")}
          >
            {"Retour à la connexion"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-sm font-medium">
          Nom complet
        </Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Damien Reynaud"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          className="h-11 rounded-xl bg-white border-border/60 focus:border-brand/50 focus:ring-brand/20 transition-all duration-200 placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="damien@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-11 rounded-xl bg-white border-border/60 focus:border-brand/50 focus:ring-brand/20 transition-all duration-200 placeholder:text-muted-foreground/50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Mot de passe
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={"••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 rounded-xl pr-11 bg-white border-border/60 focus:border-brand/50 focus:ring-brand/20 transition-all duration-200 placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-200"
            tabIndex={-1}
            aria-label={
              showPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {/* Password strength indicator */}
        {password.length > 0 && (
          <div className="space-y-1.5 animate-in fade-in duration-300">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-300",
                    level <= passwordStrength.level
                      ? passwordStrength.level <= 1
                        ? "bg-destructive"
                        : passwordStrength.level <= 2
                          ? "bg-amber-500"
                          : passwordStrength.level <= 3
                            ? "bg-brand"
                            : "bg-brand"
                      : "bg-border/40",
                  )}
                />
              ))}
            </div>
            <p
              className={cn(
                "text-xs font-medium transition-colors",
                passwordStrength.level <= 1
                  ? "text-destructive"
                  : passwordStrength.level <= 2
                    ? "text-amber-500"
                    : "text-brand",
              )}
            >
              {passwordStrength.label}
            </p>
          </div>
        )}
        {password.length === 0 && (
          <p className="text-xs text-muted-foreground/70">
            {"Minimum 8 caractères"}
          </p>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full h-12 rounded-xl bg-brand-dark hover:bg-brand-dark/90 text-white font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          {"Créer mon compte"}
        </Button>
      </div>

      <div className="relative py-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {"Déjà un compte ? "}
        <Link
          href="/login"
          className="text-brand-dark font-medium hover:text-brand transition-colors duration-200 underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </form>
  );
}

function getPasswordStrength(password: string): {
  level: number;
  label: string;
} {
  if (password.length === 0) return { level: 0, label: "" };
  if (password.length < 8) return { level: 1, label: "Trop court" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 2, label: "Moyen" };
  if (score <= 3) return { level: 3, label: "Bon" };
  return { level: 4, label: "Excellent" };
}
