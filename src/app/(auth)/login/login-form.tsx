"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        console.error("[Login] Supabase auth error:", authError.message, authError.status);
        setError("Email ou mot de passe incorrect.");
        toast.error("Email ou mot de passe incorrect");
        setPassword("");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur de connexion au serveur. Vérifiez votre connexion internet.");
      toast.error("Erreur de connexion au serveur.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-zinc-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="damien@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          required
          autoComplete="email"
          className="h-11 rounded-xl bg-white/[0.04] border-white/[0.08] text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200 placeholder:text-zinc-600"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-zinc-300">
            Mot de passe
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs text-zinc-500 hover:text-emerald-400 transition-colors duration-200"
          >
            {"Mot de passe oublié ?"}
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={"••••••••"}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            required
            autoComplete="current-password"
            className="h-11 rounded-xl pr-11 bg-white/[0.04] border-white/[0.08] text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all duration-200 placeholder:text-zinc-600"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-r-xl text-zinc-600 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors duration-200"
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
      </div>

      {error && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="mr-2 h-4 w-4" />
          )}
          Se connecter
        </Button>
      </div>

      <div className="relative py-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
      </div>

      <p className="text-center text-sm text-zinc-500">
        {"Pas encore de compte ? "}
        <Link
          href="/register"
          className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors duration-200 underline-offset-4 hover:underline"
        >
          {"Créer un compte"}
        </Link>
      </p>
    </form>
  );
}
