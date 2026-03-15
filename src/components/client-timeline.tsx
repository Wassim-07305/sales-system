"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  ClipboardCheck,
  BookOpen,
  CheckCircle2,
  XCircle,
  Swords,
  Calendar,
  PenSquare,
  MessageSquare,
  Briefcase,
  Trophy,
  Filter,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { TimelineEvent, TimelineEventType } from "@/lib/actions/timeline";

const EVENT_CONFIG: Record<
  TimelineEventType,
  {
    icon: typeof UserPlus;
    color: string;
    bg: string;
  }
> = {
  signup: { icon: UserPlus, color: "text-brand", bg: "bg-brand/20" },
  onboarding: { icon: ClipboardCheck, color: "text-blue-400", bg: "bg-blue-400/20" },
  lesson_completed: { icon: BookOpen, color: "text-green-400", bg: "bg-green-400/20" },
  quiz_passed: { icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/20" },
  quiz_failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/20" },
  roleplay_completed: { icon: Swords, color: "text-purple-400", bg: "bg-purple-400/20" },
  booking: { icon: Calendar, color: "text-yellow-400", bg: "bg-yellow-400/20" },
  journal: { icon: PenSquare, color: "text-pink-400", bg: "bg-pink-400/20" },
  message_sent: { icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-400/20" },
  deal_activity: { icon: Briefcase, color: "text-orange-400", bg: "bg-orange-400/20" },
  placement_ready: { icon: Trophy, color: "text-brand", bg: "bg-brand/20" },
  challenge_completed: { icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/20" },
};

const FILTER_OPTIONS: { label: string; types: TimelineEventType[] }[] = [
  { label: "Tout", types: [] },
  { label: "Formation", types: ["lesson_completed", "quiz_passed", "quiz_failed"] },
  { label: "Roleplay", types: ["roleplay_completed"] },
  { label: "RDV", types: ["booking"] },
  { label: "Ventes", types: ["deal_activity"] },
  { label: "Onboarding", types: ["onboarding", "signup"] },
  { label: "Journal", types: ["journal"] },
];

export function ClientTimeline({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<string>("Tout");
  const [visibleCount, setVisibleCount] = useState(20);

  const activeFilter = FILTER_OPTIONS.find((f) => f.label === filter);
  const filtered =
    activeFilter && activeFilter.types.length > 0
      ? events.filter((e) => activeFilter.types.includes(e.type))
      : events;

  const visible = filtered.slice(0, visibleCount);

  // Group by date
  const grouped: Record<string, TimelineEvent[]> = {};
  for (const event of visible) {
    const dateKey = format(new Date(event.date), "yyyy-MM-dd");
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(event);
  }

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Parcours complet</CardTitle>
          <Badge variant="outline" className="text-xs">
            {filtered.length} evenement{filtered.length > 1 ? "s" : ""}
          </Badge>
        </div>
        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap mt-3">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mt-1" />
          {FILTER_OPTIONS.map((f) => (
            <Button
              key={f.label}
              size="sm"
              variant={filter === f.label ? "default" : "outline"}
              className={`h-7 text-xs ${filter === f.label ? "bg-brand text-brand-dark" : ""}`}
              onClick={() => {
                setFilter(f.label);
                setVisibleCount(20);
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {sortedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun evenement pour ce filtre.
          </p>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((dateKey) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2">
                    {format(new Date(dateKey), "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Events for this date */}
                <div className="space-y-2 relative">
                  {/* Vertical line */}
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

                  {grouped[dateKey].map((event) => {
                    const config = EVENT_CONFIG[event.type] || EVENT_CONFIG.signup;
                    const Icon = config.icon;

                    return (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 relative pl-1"
                      >
                        {/* Icon */}
                        <div
                          className={`relative z-10 flex-shrink-0 h-7 w-7 rounded-xl ${config.bg} flex items-center justify-center ring-1 ring-border/30`}
                        >
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {event.title}
                            </p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {format(new Date(event.date), "HH:mm")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {event.description}
                          </p>
                          {event.metadata?.score !== undefined && (
                            <Badge variant="outline" className="text-[10px] mt-1">
                              Score : {String(event.metadata.score)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {visibleCount < filtered.length && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((c) => c + 20)}
            >
              <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
              Voir plus ({filtered.length - visibleCount} restants)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
