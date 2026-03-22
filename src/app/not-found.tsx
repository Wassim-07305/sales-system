import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6">
        <div className="mb-6">
          <span className="text-8xl font-bold text-emerald-500">404</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">Page introuvable</h1>
        <p className="text-muted-foreground mb-8 max-w-md">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 text-black px-6 py-2.5 text-sm font-medium hover:bg-emerald-400 transition-colors"
          >
            Retour au dashboard
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center justify-center rounded-md border border-border px-6 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Centre d&apos;aide
          </Link>
        </div>
      </div>
    </div>
  );
}
