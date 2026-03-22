"use client";

import Link from "next/link";
import { ArrowLeft, Users, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  onboarding_step: number | null;
  onboarding_completed: boolean;
  updated_at: string | null;
}

interface OnboardingsEnCoursProps {
  users: OnboardingUser[];
}

const ROLE_LABELS: Record<string, string> = {
  client_b2c: "Setter",
  client_b2b: "Entrepreneur",
  setter: "Setter",
  closer: "Closer",
  manager: "Manager",
  admin: "Admin",
};

const ROLE_COLORS: Record<string, string> = {
  client_b2c: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  client_b2b: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  setter: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closer: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  manager: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  admin: "bg-red-500/10 text-red-500 border-red-500/20",
};

const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-indigo-600",
  "bg-pink-600",
];

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getMaxSteps(role: string): number {
  return role === "client_b2b" ? 3 : 5;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Inconnu";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "A l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  if (diffD === 1) return "Hier";
  if (diffD < 7) return `Il y a ${diffD} jours`;
  if (diffD < 30) return `Il y a ${Math.floor(diffD / 7)} sem.`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function OnboardingsEnCours({ users }: OnboardingsEnCoursProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboardings en cours"
        description="Suivez la progression des utilisateurs qui n'ont pas encore termine leur onboarding."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/onboarding">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>
      </PageHeader>

      {users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">
              Aucun onboarding en cours
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Tous les utilisateurs ont termine leur onboarding. Bravo !
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {users.length} utilisateur{users.length > 1 ? "s" : ""} en cours
            d&apos;onboarding
          </p>

          <div className="grid gap-3">
            {users.map((u) => {
              const step = u.onboarding_step ?? 0;
              const maxSteps = getMaxSteps(u.role);
              const progress = Math.round((step / maxSteps) * 100);

              return (
                <Card
                  key={u.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    {/* Avatar */}
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                        getAvatarColor(u.id),
                      )}
                    >
                      {getInitials(u.full_name, u.email)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">
                          {u.full_name || u.email}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[11px] px-1.5 py-0",
                            ROLE_COLORS[u.role] || "",
                          )}
                        >
                          {ROLE_LABELS[u.role] || u.role}
                        </Badge>
                      </div>
                      {u.full_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {u.email}
                        </p>
                      )}
                    </div>

                    {/* Step indicator */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-medium">
                        Etape {step}/{maxSteps}
                      </span>
                      <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10b981] rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile step */}
                    <span className="sm:hidden text-xs font-medium text-muted-foreground shrink-0">
                      {step}/{maxSteps}
                    </span>

                    {/* Last activity */}
                    <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-28 justify-end">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(u.updated_at)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
