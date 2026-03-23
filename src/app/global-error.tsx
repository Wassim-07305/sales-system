"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="bg-[#0a0a0a] text-white flex items-center justify-center min-h-dvh">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-6 text-4xl">⚠️</div>
          <h2 className="text-xl font-bold mb-2">
            Une erreur est survenue
          </h2>
          <p className="text-gray-400 mb-6 text-sm">
            {error.message || "Erreur inattendue. Essayez de recharger la page."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 bg-emerald-500 text-black font-medium rounded-lg hover:bg-emerald-400 transition-colors"
            >
              Réessayer
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 border border-gray-600 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Tableau de bord
            </a>
          </div>
          {error.digest && (
            <p className="text-xs text-gray-500 mt-6">
              Code : {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
