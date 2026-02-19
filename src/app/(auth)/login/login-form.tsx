"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagicLink() {
    if (!email) {
      toast.error("Entrez votre email");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du lien");
      setLoading(false);
      return;
    }

    setMagicLinkSent(true);
    setLoading(false);
    toast.success("Lien de connexion envoyé !");
  }

  if (magicLinkSent) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-brand" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Vérifiez votre email</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Un lien de connexion a été envoyé à <strong>{email}</strong>
        </p>
        <Button
          variant="ghost"
          onClick={() => setMagicLinkSent(false)}
          className="text-sm"
        >
          Retour
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="damien@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Se connecter
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleMagicLink}
        disabled={loading}
      >
        <Mail className="mr-2 h-4 w-4" />
        Connexion par magic link
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-6">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-brand-dark font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
