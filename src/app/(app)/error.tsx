"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
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
    <div>
      <PageHeader title="Erreur" description="Un problème est survenu" />
      <Card>
        <CardContent className="p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">
            Oups, quelque chose s&apos;est mal passé
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {error.message ||
              "Une erreur inattendue est survenue. Essayez de recharger la page."}
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
                Tableau de bord
              </Link>
            </Button>
          </div>
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-6">
              Code erreur : {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
