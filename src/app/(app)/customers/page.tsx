import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["client_b2b", "client_b2c"])
    .order("health_score", { ascending: true });

  const atRisk = (clients || []).filter((c) => c.health_score < 40);
  const healthy = (clients || []).filter((c) => c.health_score >= 70);
  const moderate = (clients || []).filter(
    (c) => c.health_score >= 40 && c.health_score < 70
  );

  return (
    <div>
      <PageHeader
        title="Customer Success"
        description="Suivi de la santé et de l'engagement de vos clients"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{healthy.length}</p>
              <p className="text-xs text-muted-foreground">Clients sains</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{moderate.length}</p>
              <p className="text-xs text-muted-foreground">À surveiller</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{atRisk.length}</p>
              <p className="text-xs text-muted-foreground">À risque</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tous les clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(clients || []).map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                    {client.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium">{client.full_name || "Sans nom"}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.company || client.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-48">
                  <Progress
                    value={client.health_score}
                    className={`h-2 flex-1 ${
                      client.health_score >= 70
                        ? "[&>div]:bg-green-500"
                        : client.health_score >= 40
                        ? "[&>div]:bg-orange-400"
                        : "[&>div]:bg-red-500"
                    }`}
                  />
                  <span className="text-sm font-medium w-8">
                    {client.health_score}
                  </span>
                </div>
              </div>
            ))}
            {(!clients || clients.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Aucun client
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
