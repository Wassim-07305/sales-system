"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Bell, Check, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const typeIcons: Record<string, string> = {
  contract: "📄",
  level_up: "⭐",
  points: "🎯",
  health_alert: "🔴",
  nps: "📊",
  testimonial: "💬",
  testimonial_request: "🎤",
  message: "💬",
  booking_reminder: "📅",
  deal: "🤝",
  badge: "🏅",
  formation: "📚",
  prospect_reply: "💬",
  prospect_reminder: "⏰",
};

export function NotificationsView({
  notifications,
}: {
  notifications: Notification[];
}) {
  const router = useRouter();
  const unreadCount = notifications.filter((n) => !n.read).length;

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    toast.success("Toutes les notifications marquées comme lues");
    router.refresh();
  }

  async function handleClick(notif: Notification) {
    if (!notif.read) {
      await markNotificationRead(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    } else {
      router.refresh();
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`}
      >
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="h-8 gap-1.5 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </Button>
        )}
      </PageHeader>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-sm",
              !notif.read
                ? "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-400/8"
                : "hover:bg-muted/30",
            )}
            onClick={() => handleClick(notif)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center text-lg shrink-0">
                {typeIcons[notif.type || ""] || "🔔"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm", !notif.read && "font-semibold")}>
                    {notif.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                    {formatDistanceToNow(new Date(notif.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </div>
                {notif.body && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.body}
                  </p>
                )}
                {notif.link && (
                  <p className="text-[11px] text-emerald-500 mt-1.5 flex items-center gap-1 font-medium">
                    <ExternalLink className="h-3 w-3" />
                    Voir les détails
                  </p>
                )}
              </div>
              {!notif.read && (
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
              )}
            </CardContent>
          </Card>
        ))}

        {notifications.length === 0 && (
          <Card className="border-border/50 bg-muted/10">
            <CardContent className="py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="font-medium text-sm">Aucune notification</p>
              <p className="text-xs text-muted-foreground mt-1">
                Vous serez notifié ici des événements importants.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
