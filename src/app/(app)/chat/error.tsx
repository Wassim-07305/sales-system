"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Chat Error]", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-2">
            Erreur dans la messagerie
          </h2>
          <p className="text-sm text-muted-foreground mb-1">
            {error.message || "Une erreur inattendue est survenue."}
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Ouvrez la console du navigateur (F12) pour plus de détails.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              onClick={reset}
              className="bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
            </Button>
          </div>
          {error.digest && (
            <p className="text-[10px] text-muted-foreground mt-5 font-mono">
              Digest : {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
