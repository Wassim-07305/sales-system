"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Zap,
  Heart,
  TrendingUp,
  Users,
  Activity,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface AutomationRule {
  id: string;
  name: string;
  type: string;
  trigger_conditions: Record<string, unknown>;
  actions: unknown[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

interface AutomationExecution {
  id: string;
  rule_id: string;
  target_user_id: string;
  status: string;
  executed_at: string | null;
  result: Record<string, unknown>;
  created_at: string;
  rule?: { id: string; name: string; type: string } | null;
  target_user?: { id: string; full_name: string | null } | null;
}

interface Props {
  rules: AutomationRule[];
  executions: AutomationExecution[];
}

const typeLabels: Record<string, string> = {
  nurturing: "Nurturing",
  upsell: "Upsell",
  placement: "Placement",
};

const typeColors: Record<string, string> = {
  nurturing: "bg-pink-100 text-pink-700",
  upsell: "bg-purple-100 text-purple-700",
  placement: "bg-blue-100 text-blue-700",
};

export function AutomationView({ rules, executions }: Props) {
  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.is_active).length;
  const totalExecutions = executions.length;

  const recentExecutions = executions.slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Automation"
        description="Workflows automatisés"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-brand" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRules}</p>
              <p className="text-xs text-muted-foreground">Règles totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeRules}</p>
              <p className="text-xs text-muted-foreground">Règles actives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalExecutions}</p>
              <p className="text-xs text-muted-foreground">Exécutions totales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs linking to sub-pages */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Link href="/automation/nurturing">
          <Card className="hover:border-brand transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-pink-100 flex items-center justify-center">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <p className="font-semibold">Nurturing</p>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.type === "nurturing").length} règles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/automation/upsell">
          <Card className="hover:border-brand transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">Upsell</p>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.type === "upsell").length} règles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/automation/placement">
          <Card className="hover:border-brand transition-colors cursor-pointer">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">Placement</p>
                <p className="text-xs text-muted-foreground">
                  {rules.filter((r) => r.type === "placement").length} règles
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exécutions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentExecutions.length > 0 ? (
            <div className="space-y-3">
              {recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-brand" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {exec.rule?.name || "Règle inconnue"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {exec.target_user?.full_name || "Utilisateur"} —{" "}
                        {exec.executed_at
                          ? formatDistanceToNow(new Date(exec.executed_at), { addSuffix: true, locale: fr })
                          : "En attente"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={typeColors[exec.rule?.type || ""] || ""}>
                      {typeLabels[exec.rule?.type || ""] || exec.rule?.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        exec.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : exec.status === "failed"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {exec.status === "completed"
                        ? "Terminé"
                        : exec.status === "failed"
                        ? "Échoué"
                        : "En cours"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Aucune exécution récente
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
