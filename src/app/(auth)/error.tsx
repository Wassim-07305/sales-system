"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Auth Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Erreur d&apos;authentification</h2>
        <p className="max-w-md text-muted-foreground">
          Un problème est survenu lors de l&apos;authentification. Veuillez
          réessayer.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60">
            Code erreur : {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button onClick={reset} variant="default" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Retour à la connexion</Link>
        </Button>
      </div>
    </div>
  );
}
