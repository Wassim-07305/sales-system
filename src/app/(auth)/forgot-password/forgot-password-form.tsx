"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowLeft, ArrowRight } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });

      if (error) {
        toast.error("Une erreur est survenue. Veuillez r\u00e9essayer.");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      toast.error("Erreur de connexion au serveur. V\u00e9rifiez votre connexion internet.");
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand/10">
          <CheckCircle2 className="h-8 w-8 text-brand" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{"Email envoy\u00e9"}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {"Un email de r\u00e9initialisation a \u00e9t\u00e9 envoy\u00e9 \u00e0"}{" "}
            <strong className="text-foreground">{email}</strong>.
            {" V\u00e9rifiez votre bo\u00eete de r\u00e9ception et cliquez sur le lien pour r\u00e9initialiser votre mot de passe."}
          </p>
        </div>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="outline" className="w-full h-11">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {"Retour \u00e0 la connexion"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          className="h-11"
        />
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
          {"R\u00e9initialiser le mot de passe"}
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
