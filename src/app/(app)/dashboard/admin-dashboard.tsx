"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stats = [
  {
    title: "CA du mois",
    value: "24 500 €",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    title: "Clients actifs",
    value: "48",
    change: "+3",
    trend: "up" as const,
    icon: Users,
  },
  {
    title: "Pipeline total",
    value: "89 200 €",
    change: "+8.2%",
    trend: "up" as const,
    icon: TrendingUp,
  },
  {
    title: "RDV cette semaine",
    value: "12",
    change: "-2",
    trend: "down" as const,
    icon: Calendar,
  },
];

const recentDeals = [
  { name: "Formation Scale - Pierre D.", value: "3 500 €", stage: "Closing", temp: "hot" },
  { name: "Coaching B2B - Marie L.", value: "2 800 €", stage: "Proposition", temp: "warm" },
  { name: "Setter Training - Alex M.", value: "1 200 €", stage: "Appel Découverte", temp: "warm" },
  { name: "Package Full - Sophie R.", value: "5 000 €", stage: "Contacté", temp: "cold" },
];

const upcomingBookings = [
  { name: "Pierre Dupont", time: "14:00", type: "Closing" },
  { name: "Marie Laurent", time: "15:30", type: "Découverte" },
  { name: "Jean Martin", time: "16:45", type: "Découverte" },
];

export function AdminDashboard() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Vue d'ensemble de votre activité"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-brand" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${
                      stat.trend === "up"
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deals récents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDeals.map((deal, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        deal.temp === "hot"
                          ? "bg-red-500"
                          : deal.temp === "warm"
                          ? "bg-orange-400"
                          : "bg-blue-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{deal.name}</p>
                      <p className="text-xs text-muted-foreground">{deal.stage}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{deal.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prochains RDV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingBookings.map((booking, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold">
                      {booking.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{booking.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {booking.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
