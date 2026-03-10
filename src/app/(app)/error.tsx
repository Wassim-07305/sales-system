"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Une erreur est survenue</h2>
        <p className="max-w-md text-muted-foreground">
          Quelque chose s&apos;est mal passé. Veuillez réessayer ou retourner au
          tableau de bord.
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
        <Button variant="outline" className="gap-2" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  );
}
