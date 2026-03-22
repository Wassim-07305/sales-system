"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { ReputationBadge } from "@/components/community/reputation-badge";
import {
  LeaderboardCard,
  type LeaderboardEntry,
} from "@/components/community/leaderboard-card";

interface Member {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  niche: string | null;
  created_at: string;
  role: string;
}

export function MembersView({
  members,
  reputations = {},
  leaderboard = [],
}: {
  members: Member[];
  reputations?: Record<string, number>;
  leaderboard?: LeaderboardEntry[];
}) {
  const [search, setSearch] = useState("");

  const filtered = members.filter(
    (m) =>
      !search ||
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.niche?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Annuaire des membres"
        description={`${members.length} membres`}
      >
        <Link href="/community">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou niche..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((member) => (
              <Card
                key={member.id}
                className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold">
                      {member.full_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium">
                          {member.full_name || "Anonyme"}
                        </p>
                        <ReputationBadge score={reputations[member.id] || 0} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Membre{" "}
                        {formatDistanceToNow(new Date(member.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                  {member.niche && (
                    <Badge variant="outline" className="text-xs">
                      {member.niche}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">Aucun membre trouvé</p>
              </CardContent>
            </Card>
          )}
        </div>

        {leaderboard.length > 0 && (
          <div className="lg:w-72 shrink-0">
            <LeaderboardCard entries={leaderboard} />
          </div>
        )}
      </div>
    </div>
  );
}
