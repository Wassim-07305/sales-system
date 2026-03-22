"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Send,
  MessageCircle,
  Wifi,
  WifiOff,
  Phone,
  BarChart3,
  Clock,
  X,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  disconnectWhatsApp,
  sendWhatsAppMessage,
} from "@/lib/actions/whatsapp";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";

interface WhatsAppConnection {
  id: string;
  phone_number: string | null;
  status: "connected" | "disconnected" | "pending";
  connected_at: string | null;
}

interface WhatsAppMsg {
  id: string;
  direction: string;
  content: string | null;
  media_url: string | null;
  status: string;
  created_at: string;
}

interface Conversation {
  prospect_id: string;
  prospect: {
    id: string;
    name: string;
    profile_url: string | null;
    platform: string | null;
    status: string;
  } | null;
  messages: WhatsAppMsg[];
  last_message_at: string;
  unread_count: number;
}

const statusConfig = {
  connected: {
    label: "Connecté",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Wifi,
  },
  disconnected: {
    label: "Déconnecté",
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: WifiOff,
  },
  pending: {
    label: "En attente",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock,
  },
};

export function WhatsAppView({
  connection,
  conversations,
}: {
  connection: WhatsAppConnection | null;
  conversations: Conversation[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(
    conversations[0] || null,
  );
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv]);

  const filteredConvs = conversations.filter(
    (c) =>
      !search || c.prospect?.name.toLowerCase().includes(search.toLowerCase()),
  );

  const status = connection?.status || "disconnected";
  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  // Stats
  const totalConversations = conversations.length;
  const today = new Date().toISOString().split("T")[0];
  const messagesSentToday = conversations.reduce((acc, c) => {
    return (
      acc +
      c.messages.filter(
        (m) => m.direction === "outbound" && m.created_at.startsWith(today),
      ).length
    );
  }, 0);
  const totalOutbound = conversations.reduce(
    (acc, c) =>
      acc + c.messages.filter((m) => m.direction === "outbound").length,
    0,
  );
  const totalInbound = conversations.reduce(
    (acc, c) =>
      acc + c.messages.filter((m) => m.direction === "inbound").length,
    0,
  );
  const responseRate =
    totalOutbound > 0 ? Math.round((totalInbound / totalOutbound) * 100) : 0;

  async function handleSend() {
    if (!messageText.trim() || !selectedConv?.prospect) return;
    startTransition(async () => {
      try {
        await sendWhatsAppMessage({
          prospectId: selectedConv.prospect!.id,
          content: messageText,
        });
        setMessageText("");
        toast.success("Message envoyé");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'envoi du message");
      }
    });
  }

  async function handleDisconnect() {
    startTransition(async () => {
      try {
        await disconnectWhatsApp();
        toast.success("WhatsApp déconnecté");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la déconnexion");
      }
    });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="WhatsApp"
        description="Gérez vos conversations WhatsApp"
      >
        <div className="flex gap-2">
          <Link href="/whatsapp/analytics">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-medium"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/whatsapp/sequences">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-medium"
            >
              Séquences
            </Button>
          </Link>
          <Link href="/whatsapp/settings">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-medium"
            >
              Paramètres
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Warning banner when disconnected */}
      {status === "disconnected" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              WhatsApp n&apos;est pas connecté. Les messages ne seront ni
              envoyés ni reçus.{" "}
              <Link href="/whatsapp/settings" className="underline">
                Configurer la connexion
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Connection Status Card */}
      <Card className="shadow-sm rounded-2xl border-border/50">
        <CardContent className="py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center ring-1",
                status === "connected"
                  ? "ring-emerald-500/20 bg-emerald-500/10"
                  : status === "pending"
                    ? "ring-amber-500/20 bg-amber-500/10"
                    : "ring-red-500/20 bg-red-500/10",
              )}
            >
              <StatusIcon
                className={cn(
                  "h-4 w-4",
                  status === "connected"
                    ? "text-emerald-600"
                    : status === "pending"
                      ? "text-amber-600"
                      : "text-red-600",
                )}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">WhatsApp</span>
                <Badge variant="outline" className={statusInfo.color}>
                  {statusInfo.label}
                </Badge>
              </div>
              {connection?.phone_number && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" />
                  {connection.phone_number}
                </p>
              )}
            </div>
          </div>
          {status === "connected" || status === "pending" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isPending}
            >
              Déconnecter
            </Button>
          ) : (
            <Link href="/whatsapp/settings">
              <Button
                size="sm"
                className="bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl font-medium"
              >
                Connecter
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm rounded-2xl border-border/50 hover:shadow-md transition-all">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{totalConversations}</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Conversations
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-2xl border-border/50 hover:shadow-md transition-all">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{messagesSentToday}</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Messages envoyés aujourd&apos;hui
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm rounded-2xl border-border/50 hover:shadow-md transition-all">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{responseRate}%</p>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Taux de réponse
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversations */}
      <div className="grid md:grid-cols-[350px_1fr] gap-4 h-[calc(100dvh-420px)] md:h-[calc(100dvh-380px)]">
        {/* Left sidebar: conversation list */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden border-border/50",
            selectedConv ? "hidden md:flex" : "flex",
          )}
        >
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9 h-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConvs.map((conv) => {
              const lastMsg = conv.messages[conv.messages.length - 1];
              return (
                <button
                  key={conv.prospect_id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
                    selectedConv?.prospect_id === conv.prospect_id
                      ? "bg-muted"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold shrink-0">
                      {conv.prospect?.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {conv.prospect?.name || "Inconnu"}
                        </span>
                        {conv.unread_count > 0 && (
                          <Badge className="bg-emerald-500 text-black text-[10px] h-5 min-w-5 flex items-center justify-center">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {lastMsg?.content || "Aucun message"}
                      </p>
                      {conv.last_message_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_at), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredConvs.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-6 w-6 opacity-50" />
                </div>
                Aucune conversation
              </div>
            )}
          </div>
        </Card>

        {/* Right panel: message thread */}
        <Card
          className={cn(
            "flex flex-col overflow-hidden border-border/50",
            !selectedConv && "hidden md:flex",
          )}
        >
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-3 md:p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConv(null)}
                    className="md:hidden p-1 -ml-1 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xs font-bold">
                    {selectedConv.prospect?.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {selectedConv.prospect?.name || "Inconnu"}
                    </p>
                    <Badge variant="outline" className="text-[10px]">
                      WhatsApp
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {selectedConv.messages.length} messages
                  </Badge>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {selectedConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === "outbound"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                        msg.direction === "outbound"
                          ? "bg-emerald-500 text-black rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      {msg.content || (
                        <span className="italic text-muted-foreground">
                          [Média]
                        </span>
                      )}
                      <p
                        className={`text-[10px] mt-1 ${
                          msg.direction === "outbound"
                            ? "text-black/60"
                            : "text-muted-foreground"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t flex items-center gap-2">
                <Input
                  placeholder="Écrire un message..."
                  className="flex-1"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSend()
                  }
                  disabled={isPending}
                />
                <Button
                  size="sm"
                  onClick={handleSend}
                  className="bg-emerald-500 text-black hover:bg-emerald-400"
                  disabled={isPending || !messageText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageCircle className="h-7 w-7 opacity-40" />
                </div>
                <p className="font-medium">Sélectionnez une conversation</p>
                <p className="text-sm">
                  ou envoyez un nouveau message depuis vos prospects
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
