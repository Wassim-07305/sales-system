"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Eye,
  Users,
  CalendarCheck,
  ArrowRightLeft,
  TrendingUp,
  Plus,
  Search,
  LayoutGrid,
  Filter,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "@/lib/constants";
import type { BookingPage, BookingLead } from "@/lib/types/database";
import { BookingPageCard } from "./booking-page-card";
import { BookingPageFormModal } from "./booking-page-form-modal";
import { BookingsChart } from "./bookings-chart";
import {
  getBookingKPIs,
  getBookingChartData,
} from "@/lib/actions/booking-pages";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Tab = "pages" | "leads";
type Period = "day" | "week" | "month" | "quarter" | "year";
type DataScope = "all" | "mine";

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "day", label: "Jour" },
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "quarter", label: "Trimestre" },
  { value: "year", label: "Année" },
];

interface BookingDashboardProps {
  pages: BookingPage[];
  leads: BookingLead[];
  userId: string;
  initialKpis: {
    views: number;
    contacts: number;
    bookings: number;
    viewToContact: number;
    contactToBooking: number;
  };
  initialChartData: { label: string; bookings: number }[];
}

export function BookingDashboard({
  pages,
  leads,
  userId,
  initialKpis,
  initialChartData,
}: BookingDashboardProps) {
  const [tab, setTab] = useState<Tab>("pages");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leadSearch, setLeadSearch] = useState("");

  // Filters
  const [period, setPeriod] = useState<Period>("quarter");
  const [scope, setScope] = useState<DataScope>("all");
  const [isPending, startTransition] = useTransition();

  // Dynamic KPIs + chart (re-fetched on filter change)
  const [kpis, setKpis] = useState(initialKpis);
  const [chartData, setChartData] = useState(initialChartData);

  // Re-fetch KPIs + chart when filters change
  useEffect(() => {
    startTransition(async () => {
      const [newKpis, newChart] = await Promise.all([
        getBookingKPIs({
          period,
          userId: scope === "mine" ? userId : undefined,
        }),
        getBookingChartData({ period }),
      ]);
      setKpis(newKpis);
      setChartData(newChart);
    });
  }, [period, scope, userId]);

  const LEADS_PER_PAGE = 20;
  const [leadsPage, setLeadsPage] = useState(1);

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.phone?.includes(leadSearch),
  );

  const totalLeadPages = Math.ceil(filteredLeads.length / LEADS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (leadsPage - 1) * LEADS_PER_PAGE,
    leadsPage * LEADS_PER_PAGE,
  );

  const kpiCards = [
    {
      label: "Vues",
      value: kpis.views,
      icon: Eye,
      color: "bg-blue-500/10 text-blue-500",
    },
    {
      label: "Contacts",
      value: kpis.contacts,
      icon: Users,
      color: "bg-purple-500/10 text-purple-500",
    },
    {
      label: "RDV créés",
      value: kpis.bookings,
      icon: CalendarCheck,
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      label: "Vues → Contacts",
      value: `${kpis.viewToContact}%`,
      icon: ArrowRightLeft,
      color: "bg-amber-500/10 text-amber-500",
    },
    {
      label: "Contacts → RDV",
      value: `${kpis.contactToBooking}%`,
      icon: TrendingUp,
      color: "bg-pink-500/10 text-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Filters (top bar) ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Scope: Tous / Mes données */}
        <div className="inline-flex rounded-lg border border-border/40 bg-card p-1">
          <button
            onClick={() => setScope("all")}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
              scope === "all"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Tous
          </button>
          <button
            onClick={() => setScope("mine")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
              scope === "mine"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Mes données
          </button>
        </div>

        {/* Period selector */}
        <div className="inline-flex rounded-lg border border-border/40 bg-card p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                period === opt.value
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading indicator */}
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Nouvelle page button */}
        <div className="ml-auto">
          <Button
            className="bg-emerald-500 text-black hover:bg-emerald-400"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle page
          </Button>
        </div>
      </div>

      {/* ─── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border/40 bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  kpi.color,
                )}
              >
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Chart: Réservations créées ──────────────────────────────── */}
      <BookingsChart data={chartData} />

      {/* ─── Tabs: Pages de booking | Leads ──────────────────────────── */}
      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        <div className="grid grid-cols-2 border-b border-border/40">
          {(
            [
              { value: "pages", label: "Pages de booking" },
              { value: "leads", label: "Leads" },
            ] as { value: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "py-3.5 text-sm font-medium transition-all text-center",
                tab === t.value
                  ? "text-foreground border-b-2 border-foreground bg-muted/20"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ─── Tab: Pages de booking ──────────────────────────────── */}
          {tab === "pages" && (
            <div>
              {pages.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                    <LayoutGrid className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-lg">
                    Aucune page de booking
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Créez votre première page pour commencer à recevoir des
                    réservations.
                  </p>
                  <Button
                    className="mt-4 bg-emerald-500 text-black hover:bg-emerald-400"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une page
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pages.map((page) => (
                    <BookingPageCard key={page.id} page={page} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: Leads ────────────────────────────────────────── */}
          {tab === "leads" && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un lead..."
                  value={leadSearch}
                  onChange={(e) => {
                    setLeadSearch(e.target.value);
                    setLeadsPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {filteredLeads.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-medium">Aucun lead</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Les leads apparaîtront ici quand des prospects rempliront
                    vos pages de booking.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between rounded-xl border border-border/40 bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-500">
                          {lead.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {lead.email && <span>{lead.email}</span>}
                            {lead.phone && <span>· {lead.phone}</span>}
                            <span>
                              ·{" "}
                              {format(
                                new Date(lead.created_at),
                                "d MMM HH:mm",
                                { locale: fr },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lead.booking_page && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-border/60 text-muted-foreground text-xs"
                          >
                            {lead.booking_page.title}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full font-medium",
                            LEAD_STATUS_COLORS[lead.status] || "",
                          )}
                        >
                          {LEAD_STATUS_LABELS[lead.status] || lead.status}
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* Pagination */}
                  {totalLeadPages > 1 && (
                    <div className="flex items-center justify-between pt-3">
                      <p className="text-xs text-muted-foreground">
                        {filteredLeads.length} lead
                        {filteredLeads.length > 1 ? "s" : ""} — page{" "}
                        {leadsPage}/{totalLeadPages}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={leadsPage <= 1}
                          onClick={() => setLeadsPage((p) => p - 1)}
                        >
                          Précédent
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={leadsPage >= totalLeadPages}
                          onClick={() => setLeadsPage((p) => p + 1)}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Create Modal ────────────────────────────────────────────── */}
      <BookingPageFormModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}
