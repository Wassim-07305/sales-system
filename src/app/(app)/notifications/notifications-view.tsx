"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
};

export function NotificationsView({ notifications }: { notifications: Notification[] }) {
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
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check className="h-4 w-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </PageHeader>

      <div className="space-y-2">
        {notifications.map((notif) => (
          <Card
            key={notif.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${!notif.read ? "border-brand/30 bg-brand/5" : ""}`}
            onClick={() => handleClick(notif)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{typeIcons[notif.type || ""] || "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm ${!notif.read ? "font-semibold" : ""}`}>{notif.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                {notif.body && (
                  <p className="text-sm text-muted-foreground mt-0.5">{notif.body}</p>
                )}
                {notif.link && (
                  <p className="text-xs text-brand mt-1 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Voir les détails
                  </p>
                )}
              </div>
              {!notif.read && (
                <div className="h-2.5 w-2.5 rounded-full bg-brand shrink-0 mt-1.5" />
              )}
            </CardContent>
          </Card>
        ))}

        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Aucune notification</p>
              <p className="text-sm">Vous serez notifié ici des événements importants.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
