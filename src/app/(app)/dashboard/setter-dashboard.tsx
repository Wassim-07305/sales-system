"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import {
  Phone,
  CalendarCheck,
  Target,
  TrendingUp,
  Trophy,
  Flame,
} from "lucide-react";

const myStats = [
  { title: "Appels bookés", value: "8", target: "12", icon: Phone },
  { title: "Taux show-up", value: "75%", target: "80%", icon: CalendarCheck },
  { title: "Taux closing", value: "33%", target: "40%", icon: Target },
  { title: "CA généré", value: "4 200 €", target: "6 000 €", icon: TrendingUp },
];

const nextCalls = [
  { name: "Jean-Paul M.", time: "14:00", type: "Closing" },
  { name: "Sarah K.", time: "15:30", type: "Découverte" },
  { name: "Marc D.", time: "17:00", type: "Follow-up" },
];

export function SetterDashboard() {
  return (
    <div>
      <PageHeader
        title="Mon Dashboard"
        description="Tes stats et prochains calls"
      />

      {/* Gamification banner */}
      <Card className="mb-6 bg-brand-dark text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-brand/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-brand" />
              </div>
              <div>
                <p className="text-sm text-white/70">Niveau actuel</p>
                <p className="text-xl font-bold">Setter Confirmé</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-white/70">Streak</p>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <span className="text-lg font-bold">5 jours</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/70">Points</p>
                <p className="text-lg font-bold text-brand">850</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Setter Confirmé</span>
              <span>Setter Senior (1500 pts)</span>
            </div>
            <Progress value={57} className="h-2 bg-white/10" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {myStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground">{stat.title}</span>
                </div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">
                  Objectif : {stat.target}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Next calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prochains appels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {nextCalls.map((call, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                    {call.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{call.name}</p>
                    <p className="text-xs text-muted-foreground">{call.type}</p>
                  </div>
                </div>
                <span className="text-sm font-medium">{call.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
