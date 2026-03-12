"use client";

import { useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileBarChart,
  Plus,
  Download,
  DollarSign,
  Handshake,
  UserPlus,
  Percent,
  Activity,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generateMonthlyReport } from "@/lib/actions/white-label";

interface Report {
  id: string;
  entrepreneur_id: string;
  report_month: string;
  metrics: Record<string, unknown>;
  pdf_url: string | null;
  generated_at: string;
}

function formatMonth(reportMonth: string): string {
  const [year, month] = reportMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return format(date, "MMMM yyyy", { locale: fr });
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function PortalReportsView({ reports }: { reports: Report[] }) {
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateMonthlyReport();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Rapport généré avec succès");
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Rapports Mensuels"
        description="Suivi détaillé de vos performances"
      >
        <Button onClick={handleGenerate} disabled={isPending}>
          <Plus className="h-4 w-4 mr-2" />
          {isPending ? "Génération..." : "Générer le rapport du mois"}
        </Button>
      </PageHeader>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium text-lg">Aucun rapport</p>
            <p className="text-sm mt-1">
              Cliquez sur &quot;Générer le rapport du mois&quot; pour créer
              votre premier rapport mensuel.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const metrics = report.metrics || {};
            return (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">
                      {formatMonth(report.report_month)}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(report.generated_at), "dd/MM/yyyy", {
                          locale: fr,
                        })}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!report.pdf_url}
                        onClick={() => {
                          if (report.pdf_url)
                            window.open(report.pdf_url, "_blank");
                        }}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <MetricItem
                      icon={<DollarSign className="h-4 w-4" />}
                      label="Chiffre d'affaires"
                      value={`${Number(metrics.revenue || 0).toLocaleString("fr-FR")} €`}
                    />
                    <MetricItem
                      icon={<Handshake className="h-4 w-4" />}
                      label="Deals conclus"
                      value={String(metrics.deals_closed || 0)}
                    />
                    <MetricItem
                      icon={<UserPlus className="h-4 w-4" />}
                      label="Nouveaux prospects"
                      value={String(metrics.new_prospects || 0)}
                    />
                    <MetricItem
                      icon={<Percent className="h-4 w-4" />}
                      label="Taux de conversion"
                      value={`${metrics.conversion_rate || 0}%`}
                    />
                    <MetricItem
                      icon={<Activity className="h-4 w-4" />}
                      label="Performance setters"
                      value={`${metrics.setter_performance || 0}%`}
                    />
                    <MetricItem
                      icon={<TrendingUp className="h-4 w-4" />}
                      label="Valeur moy. deal"
                      value={`${Number(metrics.avg_deal_value || 0).toLocaleString("fr-FR")} €`}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
