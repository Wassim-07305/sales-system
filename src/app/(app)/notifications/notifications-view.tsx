"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ExternalLink,
  FileText,
  Star,
  Target,
  AlertCircle,
  BarChart3,
  MessageSquare,
  Mic,
  Calendar,
  Handshake,
  Award,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
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

interface TypeConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

const typeConfigs: Record<string, TypeConfig> = {
  contract: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  level_up: { icon: Star, color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900/30" },
  points: { icon: Target, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  health_alert: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  nps: { icon: BarChart3, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  testimonial: { icon: MessageSquare, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  testimonial_request: { icon: Mic, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  message: { icon: MessageSquare, color: "text-sky-600", bgColor: "bg-sky-100 dark:bg-sky-900/30" },
  booking_reminder: { icon: Calendar, color: "text-teal-600", bgColor: "bg-teal-100 dark:bg-teal-900/30" },
  deal: { icon: Handshake, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  badge: { icon: Award, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  formation: { icon: GraduationCap, color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
};

const defaultConfig: TypeConfig = {
  icon: Bell,
  color: "text-gray-600",
  bgColor: "bg-gray-100 dark:bg-gray-800",
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
        {notifications.map((notif) => {
          const config = typeConfigs[notif.type || ""] || defaultConfig;
          const IconComponent = config.icon;

          return (
          <Card
            key={notif.id}
            className={`cursor-pointer transition-all hover:shadow-md ${!notif.read ? "border-brand/30 bg-brand/5" : "hover:bg-muted/50"}`}
            onClick={() => handleClick(notif)}
          >
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
                <IconComponent className={`h-5 w-5 ${config.color}`} />
              </div>
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
                <div className="h-2.5 w-2.5 rounded-full bg-brand shrink-0 mt-1.5 animate-pulse" />
              )}
            </CardContent>
          </Card>
        );
        })}

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
