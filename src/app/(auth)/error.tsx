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
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-center bg-[#09090b]">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 shadow-sm">
        <AlertTriangle className="h-9 w-9 text-red-500" />
      </div>

      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-white">
          Erreur d&apos;authentification
        </h2>
        <p className="max-w-md text-zinc-400 text-sm leading-relaxed">
          Un probl&egrave;me est survenu lors de l&apos;authentification.
          Veuillez r&eacute;essayer.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/50 font-mono">
            Code erreur : {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={reset}
          variant="default"
          className="gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm hover:shadow-md transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4" />
          R&eacute;essayer
        </Button>
        <Button
          variant="outline"
          asChild
          className="rounded-xl border-white/[0.08] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all duration-200"
        >
          <Link href="/login">Retour &agrave; la connexion</Link>
        </Button>
      </div>
    </div>
  );
}
