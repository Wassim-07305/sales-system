"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import {
  MessageSquare,
  Phone,
  Mail,
  Instagram,
  Linkedin,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getUnipileStatus,
  getUnipileConversations,
  getUnipileMessages,
  generateUnipileAuthLink,
} from "@/lib/actions/unipile";
import { toast } from "sonner";

type Platform = "all" | "whatsapp" | "linkedin" | "instagram" | "email";

interface Conversation {
  id: string;
  provider: string;
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  senderId: string;
  timestamp: string;
  isFromMe: boolean;
}

interface Account {
  id: string;
  provider: string;
  channel: string;
  name: string;
  status: string;
}

/** Returns true when viewport is >= 768px (md breakpoint) */
function useIsDesktop() {
  const subscribe = useCallback((cb: () => void) => {
    const mql = window.matchMedia("(min-width: 768px)");
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  }, []);
  const getSnapshot = useCallback(
    () => window.matchMedia("(min-width: 768px)").matches,
    [],
  );
  const getServerSnapshot = useCallback(() => true, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const PLATFORMS: {
  id: Platform;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    id: "all",
    label: "Tous",
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    color: "text-foreground",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: <Phone className="h-3.5 w-3.5" />,
    color: "text-green-500",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: <Linkedin className="h-3.5 w-3.5" />,
    color: "text-blue-500",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: <Instagram className="h-3.5 w-3.5" />,
    color: "text-pink-500",
  },
  {
    id: "email",
    label: "Email",
    icon: <Mail className="h-3.5 w-3.5" />,
    color: "text-amber-500",
  },
];

function platformIcon(provider: string) {
  switch (provider) {
    case "whatsapp":
      return <Phone className="h-3.5 w-3.5 text-green-500" />;
    case "linkedin":
      return <Linkedin className="h-3.5 w-3.5 text-blue-500" />;
    case "instagram":
      return <Instagram className="h-3.5 w-3.5 text-pink-500" />;
    case "email":
      return <Mail className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function timeAgo(date: string) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function UnifiedInbox() {
  const [activePlatform, setActivePlatform] = useState<Platform>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [connectingAccount, setConnectingAccount] = useState(false);
  const isDesktop = useIsDesktop();

  async function handleConnectAccount(provider: "WHATSAPP" | "LINKEDIN" | "INSTAGRAM" | "MAIL") {
    setConnectingAccount(true);
    try {
      const result = await generateUnipileAuthLink(provider);
      if (result.error) {
        toast.error(result.error);
      } else if (result.url) {
        window.open(result.url, "_blank", "width=600,height=700,scrollbars=yes");
        toast.info("Connectez votre compte, puis rechargez la page");
      }
    } catch {
      toast.error("Erreur lors de la connexion");
    } finally {
      setConnectingAccount(false);
    }
  }

  // Load status + conversations
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const status = await getUnipileStatus();
        if (cancelled) return;
        setConfigured(status.configured);
        setAccounts(status.accounts);

        if (status.configured && status.accounts.length > 0) {
          const results = await Promise.all(
            status.accounts.map((acc) => getUnipileConversations(acc.id)),
          );
          if (cancelled) return;
          const allConvs = results.flatMap((r) => r.conversations);
          allConvs.sort((a, b) => {
            const ta = a.lastMessageAt
              ? new Date(a.lastMessageAt).getTime()
              : 0;
            const tb = b.lastMessageAt
              ? new Date(b.lastMessageAt).getTime()
              : 0;
            return tb - ta;
          });
          setConversations(allConvs);
        }
      } catch (err) {
        console.error("UnifiedInbox load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load messages when selecting a conversation
  const handleSelectConv = useCallback(async (convId: string) => {
    setSelectedConv(convId);
    setLoadingMessages(true);
    try {
      const result = await getUnipileMessages(convId);
      setMessages(result.messages);
    } catch {
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Filter conversations
  const filtered = conversations.filter((c) => {
    if (activePlatform !== "all" && c.provider !== activePlatform) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchParticipants = c.participants.some((p) =>
        p.toLowerCase().includes(q),
      );
      const matchMessage = c.lastMessage?.toLowerCase().includes(q);
      if (!matchParticipants && !matchMessage) return false;
    }
    return true;
  });

  // Not configured — show setup cards
  if (!loading && (!configured || accounts.length === 0)) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Boîte unifiée</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralisez vos conversations externes
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-semibold mb-2">Boîte unifiée</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connectez vos comptes pour centraliser vos conversations WhatsApp,
              LinkedIn, Instagram et Email.
            </p>
            <div className="space-y-2 text-left">
              {[
                {
                  icon: <Phone className="h-4 w-4 text-green-500" />,
                  label: "WhatsApp Business",
                  desc: "Connectez votre compte WhatsApp",
                },
                {
                  icon: <Linkedin className="h-4 w-4 text-blue-500" />,
                  label: "LinkedIn",
                  desc: "Synchronisez vos messages LinkedIn",
                },
                {
                  icon: <Instagram className="h-4 w-4 text-pink-500" />,
                  label: "Instagram",
                  desc: "Connectez votre messagerie Instagram",
                },
                {
                  icon: <Mail className="h-4 w-4 text-amber-500" />,
                  label: "Email",
                  desc: "Intégrez votre boîte mail",
                },
              ].map((item) => (
                <a
                  key={item.label}
                  href="/settings/integrations"
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="shrink-0">
          <h2 className="text-base md:text-lg font-semibold">Boîte unifiée</h2>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            {accounts.length} compte{accounts.length > 1 ? "s" : ""} connecté
            {accounts.length > 1 ? "s" : ""}
          </p>
        </div>
        {(() => {
          const connectedProviders = new Set(
            accounts.map((a) => a.provider.toUpperCase()),
          );
          const connectButtons = [
            { provider: "WHATSAPP" as const, label: "WhatsApp", icon: <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 text-green-500" /> },
            { provider: "LINKEDIN" as const, label: "LinkedIn", icon: <Linkedin className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-500" /> },
            { provider: "INSTAGRAM" as const, label: "Instagram", icon: <Instagram className="h-3 w-3 md:h-3.5 md:w-3.5 text-pink-500" /> },
            { provider: "MAIL" as const, label: "Email", icon: <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-500" /> },
          ].filter((b) => !connectedProviders.has(b.provider));

          return connectButtons.length > 0 ? (
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] md:text-xs text-muted-foreground shrink-0">Connecter :</span>
              {connectButtons.map((b) => (
                <Button
                  key={b.provider}
                  size="sm"
                  variant="outline"
                  className="text-[10px] md:text-xs h-7 md:h-8 gap-1 px-2 md:px-3 shrink-0"
                  disabled={connectingAccount}
                  onClick={() => handleConnectAccount(b.provider)}
                >
                  {b.icon}
                  <span className="hidden sm:inline">{b.label}</span>
                </Button>
              ))}
            </div>
          ) : null;
        })()}
      </div>

      {/* Two-column layout: sidebar (list) + message panel */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-row">
        {/* LEFT COLUMN: tabs + search + conversation list */}
        {(isDesktop || !selectedConv) && (
        <div
          className="flex flex-col border-r overflow-hidden shrink-0"
          style={{ width: isDesktop ? 320 : "100%" }}
        >
          {/* Platform tabs */}
          <div className="flex items-center border-b px-2 py-1.5 shrink-0">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePlatform(p.id)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap",
                  activePlatform === p.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <span className={p.color}>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une conversation..."
                className="h-8 pl-8 text-xs"
              />
            </div>
            <button className="rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Aucune conversation
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors",
                      selectedConv === conv.id && "bg-muted/70",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        {platformIcon(conv.provider)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {conv.participants.join(", ") || "Contact"}
                          </p>
                          {conv.lastMessageAt && (
                            <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(conv.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.lastMessage}
                          </p>
                        )}
                        {conv.unreadCount > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Circle className="h-2 w-2 fill-brand text-brand" />
                            <span className="text-[10px] font-medium text-brand">
                              {conv.unreadCount} non lu
                              {conv.unreadCount > 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* RIGHT COLUMN: message panel */}
        {(isDesktop || selectedConv) && (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {!selectedConv ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <MessageSquare className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-sm font-semibold">
                  Sélectionnez une conversation
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Choisissez une conversation dans la liste
                </p>
              </div>
            </div>
          ) : (
            <>
            {/* Mobile back button + conversation header */}
            <div className={cn("flex items-center gap-3 px-4 py-3 border-b", isDesktop && "hidden")}>
              <button
                onClick={() => setSelectedConv(null)}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                {(() => {
                  const conv = conversations.find((c) => c.id === selectedConv);
                  return conv ? (
                    <>
                      {platformIcon(conv.provider)}
                      <p className="text-sm font-medium truncate">
                        {conv.participants.join(", ") || "Contact"}
                      </p>
                    </>
                  ) : null;
                })()}
              </div>
            </div>
            {loadingMessages ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    Aucun message dans cette conversation
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.isFromMe ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] rounded-2xl px-4 py-2.5",
                        msg.isFromMe
                          ? "bg-brand/10 text-foreground"
                          : "bg-muted",
                      )}
                    >
                      {!msg.isFromMe && (
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                          {msg.sender}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        {new Date(msg.timestamp).toLocaleString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            )}
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
