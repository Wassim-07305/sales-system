"use client";

import { useEffect, useState } from "react";
import { Users, Flame, Thermometer, Snowflake, Send, MessageCircle, Target } from "lucide-react";
import { getDailyQuota, getProspectSegmentStats } from "@/lib/actions/prospecting";

interface KPIData {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  avgScore: number;
  dmsSent: number;
  dmsTarget: number;
  replies: number;
  bookings: number;
}

export function ProspectingKPIBanner() {
  const [data, setData] = useState<KPIData | null>(null);

  useEffect(() => {
    Promise.all([getProspectSegmentStats(), getDailyQuota()]).then(
      ([stats, quota]) => {
        setData({
          total: stats.total ?? 0,
          hot: stats.hot ?? 0,
          warm: stats.warm ?? 0,
          cold: stats.cold ?? 0,
          avgScore: stats.avgScore ?? 0,
          dmsSent: quota?.dms_sent ?? 0,
          dmsTarget: quota?.dms_target ?? 20,
          replies: quota?.replies_received ?? 0,
          bookings: quota?.bookings_from_dms ?? 0,
        });
      },
    );
  }, []);

  if (!data) return null;

  const items = [
    { icon: Users, label: "Prospects", value: data.total },
    { icon: Flame, label: "Chauds", value: data.hot },
    { icon: Thermometer, label: "Tièdes", value: data.warm },
    { icon: Snowflake, label: "Froids", value: data.cold },
    { icon: Send, label: "DMs", value: `${data.dmsSent}/${data.dmsTarget}` },
    { icon: MessageCircle, label: "Réponses", value: data.replies },
    { icon: Target, label: "RDV", value: data.bookings },
  ];

  return (
    <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-2 px-1">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-1.5 text-sm whitespace-nowrap"
        >
          <item.icon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="font-semibold">{item.value}</span>
          <span className="text-muted-foreground text-xs">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
