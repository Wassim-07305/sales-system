"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const passwordStrength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caract\u00e8res");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error("Une erreur est survenue. Veuillez r\u00e9essayer.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setSuccess(true);
    } catch {
      toast.error("Erreur de connexion au serveur. V\u00e9rifiez votre connexion internet.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <CheckCircle2 className="h-8 w-8 text-brand" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{"Mot de passe mis \u00e0 jour"}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {"Votre mot de passe a \u00e9t\u00e9 modifi\u00e9 avec succ\u00e8s. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."}
          </p>
        </div>
        <div className="pt-2">
          <Button
            className="w-full h-11 bg-brand-dark hover:bg-brand-dark/90 text-white font-medium"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {"Acc\u00e9der \u00e0 mon espace"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
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
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    level <= passwordStrength.level
                      ? passwordStrength.level <= 1
                        ? "bg-destructive"
                        : passwordStrength.level <= 2
                          ? "bg-amber-500"
                          : "bg-brand"
                      : "bg-border"
                  )}
                />
              ))}
            </div>
            <p className={cn(
              "text-xs transition-colors",
              passwordStrength.level <= 1
                ? "text-destructive"
                : passwordStrength.level <= 2
                  ? "text-amber-500"
                  : "text-muted-foreground"
            )}>
              {passwordStrength.label}
            </p>
          </div>
        )}
        {password.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {"Minimum 8 caract\u00e8res"}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder={"\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={cn(
              "h-11 pr-11",
              passwordsMatch && "border-brand focus-visible:border-brand",
              passwordsMismatch && "border-destructive focus-visible:border-destructive"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
            tabIndex={-1}
            aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {passwordsMismatch && (
          <p className="text-xs text-destructive animate-in fade-in duration-300">
            Les mots de passe ne correspondent pas
          </p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-brand animate-in fade-in duration-300">
            Les mots de passe correspondent
          </p>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full h-11 bg-brand-dark hover:bg-brand-dark/90 text-white font-medium"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          {"Mettre \u00e0 jour le mot de passe"}
        </Button>
      </div>

      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-foreground font-medium hover:underline underline-offset-4 transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          {"Retour \u00e0 la connexion"}
        </Link>
      </p>
    </form>
  );
}

function getPasswordStrength(password: string): { level: number; label: string } {
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
