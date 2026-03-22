import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Calendar, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function CallsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["client_b2b", "client_b2c"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: calls } = await supabase
    .from("group_calls")
    .select("*")
    .order("scheduled_at", { ascending: false });

  const upcomingCalls = (calls || []).filter(
    (c) => new Date(c.scheduled_at) >= new Date(),
  );
  const pastCalls = (calls || []).filter(
    (c) => new Date(c.scheduled_at) < new Date(),
  );

  return (
    <div>
      <PageHeader
        title="Calls de groupe"
        description="Participez aux calls et accédez aux replays"
      />

      {upcomingCalls.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mb-4">Prochains calls</h2>
          <div className="space-y-3 mb-8">
            {upcomingCalls.map((call) => (
              <Card
                key={call.id}
                className="rounded-xl border-border/50 shadow-sm"
              >
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Video className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{call.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(call.scheduled_at), "EEEE d MMMM", {
                            locale: fr,
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(call.scheduled_at), "HH:mm")} -{" "}
                          {call.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                  {call.meeting_link && (
                    <Button
                      size="sm"
                      className="bg-emerald-500 text-black hover:bg-emerald-400"
                      asChild
                    >
                      <a
                        href={call.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Rejoindre
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold mb-4">Replays</h2>
      <div className="space-y-3">
        {pastCalls.map((call) => (
          <Card key={call.id} className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <Video className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{call.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(call.scheduled_at), "d MMMM yyyy", {
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
              {call.replay_url ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={call.replay_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Video className="h-4 w-4 mr-1" />
                    Voir le replay
                  </a>
                </Button>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Replay bientot
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
        {pastCalls.length === 0 && (
          <Card className="rounded-xl border-border/50 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Video className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Aucun replay disponible</p>
              <p className="text-sm text-muted-foreground">
                Les replays des calls seront accessibles ici
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
