"use client";

import { useEffect, useState } from "react";
import { Bell, Check, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { useUIStore } from "@/stores/ui-store";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

interface TopbarProps {
  title: string;
  userId: string;
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

export function Topbar({ title, userId }: TopbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { setSearchOpen } = useUIStore();

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial notifications
    async function fetchNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    }

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
          toast(newNotif.title, { description: newNotif.body || undefined });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 backdrop-blur-sm px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Rechercher...</span>
          <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-brand text-brand-dark text-[10px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-96 max-h-[70vh] overflow-y-auto rounded-2xl"
          >
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={handleMarkAllRead}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Tout lire
                  </Button>
                )}
                <Link href="/notifications">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    Voir tout
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>

            {notifications.length > 0 ? (
              notifications.slice(0, 10).map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className={`p-3 cursor-pointer ${!notif.read ? "bg-brand/5" : ""}`}
                  onClick={() => {
                    if (!notif.read) handleMarkRead(notif.id);
                    if (notif.link) window.location.href = notif.link;
                  }}
                >
                  <div className="flex gap-3 w-full">
                    <span className="text-lg shrink-0">
                      {typeIcons[notif.type || ""] || "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${!notif.read ? "font-semibold" : ""}`}
                      >
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground truncate">
                          {notif.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        {formatDistanceToNow(new Date(notif.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-brand shrink-0 mt-1.5" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aucune notification
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
