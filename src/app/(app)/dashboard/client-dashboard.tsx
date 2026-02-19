"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Video,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";

const progressItems = [
  { title: "Onboarding", progress: 80, icon: CheckCircle2 },
  { title: "Formation", progress: 45, icon: BookOpen },
  { title: "Calls de groupe", progress: 60, icon: Video },
];

const nextEvents = [
  {
    title: "Call de groupe #12 — Mindset Closing",
    date: "Mar 19 Fév",
    time: "18:00",
    type: "call",
  },
  {
    title: "Check-in 1-on-1 avec Damien",
    date: "Jeu 21 Fév",
    time: "10:00",
    type: "meeting",
  },
  {
    title: "Deadline Module 3 — Prospection",
    date: "Dim 24 Fév",
    time: "23:59",
    type: "deadline",
  },
];

export function ClientDashboard() {
  return (
    <div>
      <PageHeader
        title="Mon Espace"
        description="Bienvenue dans votre espace Sales System"
      />

      {/* Welcome card */}
      <Card className="mb-6 bg-brand-dark text-white border-0">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">
            Continue sur ta lancée !
          </h2>
          <p className="text-white/70 text-sm mb-4">
            Tu as complété 45% de ta formation. Continue pour débloquer la suite.
          </p>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <BarChart3 className="h-4 w-4 text-brand" />
              <span className="text-sm">3 appels bookés</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <Calendar className="h-4 w-4 text-brand" />
              <span className="text-sm">2 calls cette semaine</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ma progression</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {progressItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-brand" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.progress}%
                    </span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Upcoming events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prochains événements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {nextEvents.map((event, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <div className="mt-0.5">
                    {event.type === "call" ? (
                      <Video className="h-4 w-4 text-brand" />
                    ) : event.type === "meeting" ? (
                      <Calendar className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.date} à {event.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
