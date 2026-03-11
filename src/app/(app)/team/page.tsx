import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTeamKPIs } from "@/lib/actions/dashboard";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Target,
  TrendingUp,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function TrendBadge({ delta, suffix = "" }: { delta: number; suffix?: string }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        0{suffix}
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-500">
        <ArrowUp className="h-3 w-3" />
        +{delta}{suffix}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <ArrowDown className="h-3 w-3" />
      {delta}{suffix}
    </span>
  );
}

export default async function TeamPage() {
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

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const kpis = await getTeamKPIs();

  const stats = [
    {
      name: "Total appels bookés",
      value: String(kpis.summary.totalBookings),
      icon: Phone,
      trend: kpis.trends.bookingsDelta,
      suffix: "",
    },
    {
      name: "Taux show-up moyen",
      value: `${kpis.summary.showUpRate}%`,
      icon: Target,
      trend: kpis.trends.showUpDelta,
      suffix: " pts",
    },
    {
      name: "Taux closing moyen",
      value: `${kpis.summary.closingRate}%`,
      icon: TrendingUp,
      trend: kpis.trends.closingDelta,
      suffix: " pts",
    },
    {
      name: "CA généré total",
      value: formatCurrency(kpis.summary.totalRevenue),
      icon: Trophy,
      trend: kpis.trends.revenueDelta,
      suffix: " €",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Équipe"
        description="Performance de votre équipe de setters et closers"
      />

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground">
                    {stat.name}
                  </span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <div className="mt-1">
                  <TrendBadge
                    delta={stat.name === "CA généré total" ? Math.round(stat.trend) : stat.trend}
                    suffix={stat.suffix}
                  />
                  <span className="text-[10px] text-muted-foreground ml-1">
                    vs mois dernier
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Per-member KPI table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            KPIs individuels de l&apos;équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          {kpis.members.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Aucun membre dans l&apos;équipe
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-3 pr-4 font-medium">Membre</th>
                    <th className="text-left py-3 px-4 font-medium">Rôle</th>
                    <th className="text-right py-3 px-4 font-medium">
                      Bookings
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Show-up
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Closing
                    </th>
                    <th className="text-right py-3 px-4 font-medium">
                      Deals
                    </th>
                    <th className="text-right py-3 pl-4 font-medium">CA</th>
                  </tr>
                </thead>
                <tbody>
                  {kpis.members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <Link href={`/contacts/${member.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                            {member.fullName?.charAt(0) || "?"}
                          </div>
                          <span className="font-medium hover:text-brand hover:underline">
                            {member.fullName || "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {member.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {member.bookings}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={
                            member.showUpRate >= 70
                              ? "text-emerald-500"
                              : member.showUpRate >= 50
                                ? "text-amber-500"
                                : "text-red-500"
                          }
                        >
                          {member.showUpRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={
                            member.closingRate >= 30
                              ? "text-emerald-500"
                              : member.closingRate >= 15
                                ? "text-amber-500"
                                : "text-red-500"
                          }
                        >
                          {member.closingRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {member.dealsClosed}/{member.dealsTotal}
                      </td>
                      <td className="py-3 pl-4 text-right tabular-nums font-medium">
                        {formatCurrency(member.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
