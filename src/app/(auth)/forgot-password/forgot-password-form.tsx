"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
    });

    if (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-brand" />
        <h3 className="text-lg font-semibold">Email envoyé</h3>
        <p className="text-muted-foreground text-sm">
          Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
          Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
        </p>
        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/login" className="text-brand-dark font-medium hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <Button
        type="submit"
        className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
        disabled={loading}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Réinitialiser le mot de passe
      </Button>

      <p className="text-center text-sm text-muted-foreground mt-6">
        <Link href="/login" className="text-brand-dark font-medium hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
