"use client";

import { useEffect, useState } from "react";
import { Users, Flame, Send, MessageCircle, Target } from "lucide-react";
import { getDailyQuota, getProspectSegmentStats } from "@/lib/actions/prospecting";
import { Skeleton } from "@/components/ui/skeleton";

interface KPIData {
  total: number;
  hot: number;
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
          dmsSent: quota?.dms_sent ?? 0,
          dmsTarget: quota?.dms_target ?? 20,
          replies: quota?.replies_received ?? 0,
          bookings: quota?.bookings_from_dms ?? 0,
        });
      },
    );
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-6 py-2.5 px-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-4 w-6 rounded" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const items = [
    { icon: Users, label: "Prospects", value: data.total },
    { icon: Flame, label: "Chauds", value: data.hot },
    { icon: Send, label: "DMs", value: `${data.dmsSent}/${data.dmsTarget}` },
    { icon: MessageCircle, label: "Réponses", value: data.replies },
    { icon: Target, label: "RDV", value: data.bookings },
  ];

  return (
    <div className="flex items-center gap-6 overflow-x-auto scrollbar-none py-2.5 px-1">
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
