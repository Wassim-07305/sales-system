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
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
        },
      );

      if (error) {
        toast.error("Une erreur est survenue. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      setSent(true);
      setLoading(false);
    } catch {
      toast.error(
        "Erreur de connexion au serveur. Vérifiez votre connexion internet.",
      );
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-brand/10 shadow-sm">
          <CheckCircle2 className="h-9 w-9 text-brand" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-brand-dark">
            {"Email envoyé"}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {
              "Un email de réinitialisation a été envoyé à"
            }{" "}
            <strong className="text-foreground">{email}</strong>.
            {
              " Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe."
            }
          </p>
        </div>
        <div className="pt-2">
          <Link href="/login">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-border/60 hover:border-brand/50 hover:bg-brand/5 transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {"Retour à la connexion"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
          {"Réinitialiser le mot de passe"}
        </Button>
      </div>

      <div className="relative py-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-brand-dark font-medium hover:text-brand transition-colors duration-200 underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {"Retour à la connexion"}
        </Link>
      </p>
    </form>
  );
}
