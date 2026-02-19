import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Phone, Target, TrendingUp, Trophy } from "lucide-react";

export default async function TeamPage() {
  const supabase = await createClient();

  const { data: teamMembers } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["setter", "closer"])
    .order("created_at");

  // Mock stats for demo
  const stats = [
    {
      name: "Total appels bookés",
      value: "87",
      icon: Phone,
    },
    {
      name: "Taux show-up moyen",
      value: "72%",
      icon: Target,
    },
    {
      name: "Taux closing moyen",
      value: "28%",
      icon: TrendingUp,
    },
    {
      name: "CA généré total",
      value: "34 200 €",
      icon: Trophy,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Équipe"
        description="Performance de votre équipe de setters et closers"
      />

      {/* Team stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground">{stat.name}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Membres de l&apos;équipe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(teamMembers || []).map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                    {member.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{member.full_name}</p>
                    <Badge variant="outline" className="mt-0.5 capitalize">
                      {member.role}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
            {(!teamMembers || teamMembers.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Aucun membre dans l&apos;équipe
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
