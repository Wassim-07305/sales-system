"use client";

import { useEffect } from "react";

export default function ConnectedPage() {
  useEffect(() => {
    // Auto-close the popup after a short delay
    const timer = setTimeout(() => {
      window.close();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">Compte connecté !</h2>
        <p className="text-sm text-muted-foreground">
          Cette fenêtre va se fermer automatiquement…
        </p>
      </div>
    </div>
  );
}
