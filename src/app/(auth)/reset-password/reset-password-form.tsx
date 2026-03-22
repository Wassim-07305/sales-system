"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
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
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error("Une erreur est survenue. Veuillez réessayer.");
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
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-emerald-500/10 shadow-sm">
          <CheckCircle2 className="h-9 w-9 text-emerald-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">
            {"Mot de passe mis à jour"}
          </h3>
          <p className="text-zinc-400 text-sm leading-relaxed">
            {
              "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
            }
          </p>
        </div>
        <div className="pt-2">
          <Button
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-medium shadow-sm hover:shadow-md transition-all duration-200"
            onClick={() => {
              router.push("/dashboard");
              router.refresh();
            }}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            {"Accéder à mon espace"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
          Nouveau mot de passe
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
            className="h-11 rounded-xl pr-11 bg-white/[0.04] border-white/[0.08] text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200 placeholder:text-zinc-600"
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
                          : "bg-emerald-500"
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
                    : "text-emerald-400",
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
      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
          Confirmer le mot de passe
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder={"••••••••"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className={cn(
              "h-11 rounded-xl pr-11 bg-white/[0.04] border-white/[0.08] text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200 placeholder:text-zinc-600",
              passwordsMatch && "border-emerald-500/60 focus-visible:border-emerald-500",
              passwordsMismatch &&
                "border-destructive/60 focus-visible:border-destructive",
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-200"
            tabIndex={-1}
            aria-label={
              showConfirmPassword
                ? "Masquer le mot de passe"
                : "Afficher le mot de passe"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {passwordsMismatch && (
          <p className="text-xs text-destructive font-medium animate-in fade-in duration-300">
            Les mots de passe ne correspondent pas
          </p>
        )}
        {passwordsMatch && (
          <p className="text-xs text-emerald-400 font-medium animate-in fade-in duration-300">
            Les mots de passe correspondent
          </p>
        )}
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          {"Mettre à jour le mot de passe"}
        </Button>
      </div>

      <div className="relative py-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-white font-medium hover:text-emerald-300 transition-colors duration-200 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {"Retour à la connexion"}
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
