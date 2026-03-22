"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";
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
  UserPlus,
  Check,
  Send,
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
import { createProspect } from "@/lib/actions/prospects";
import { sendUnipileMessage } from "@/lib/actions/unipile";
import { toast } from "sonner";

type Platform = "all" | "whatsapp" | "linkedin" | "instagram" | "email";

interface Conversation {
  id: string;
  accountId?: string;
  provider: string;
  participants: string[];
  pictureUrl?: string;
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
      return <Phone className="h-2.5 w-2.5 text-green-500" />;
    case "linkedin":
      return <Linkedin className="h-2.5 w-2.5 text-blue-500" />;
    case "instagram":
      return <Instagram className="h-2.5 w-2.5 text-pink-500" />;
    case "email":
      return <Mail className="h-2.5 w-2.5 text-amber-500" />;
    default:
      return <MessageSquare className="h-2.5 w-2.5 text-muted-foreground" />;
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
  const [addedToCrm, setAddedToCrm] = useState<Set<string>>(new Set());
  const [addingToCrm, setAddingToCrm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();

  const connectedProviders = new Set(
    accounts.map((a) => a.provider.toUpperCase()),
  );
  const missingProviders = [
    { provider: "WHATSAPP" as const, label: "WhatsApp", icon: <Phone className="h-4 w-4 text-green-500" /> },
    { provider: "LINKEDIN" as const, label: "LinkedIn", icon: <Linkedin className="h-4 w-4 text-blue-500" /> },
    { provider: "INSTAGRAM" as const, label: "Instagram", icon: <Instagram className="h-4 w-4 text-pink-500" /> },
    { provider: "MAIL" as const, label: "Email", icon: <Mail className="h-4 w-4 text-amber-500" /> },
  ].filter((b) => !connectedProviders.has(b.provider));

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

  async function handleAddToCrm(conv: Conversation) {
    setAddingToCrm(true);
    try {
      const name = conv.participants.join(", ") || "Contact";
      const profileUrl = conv.provider === "linkedin" && conv.participants[0]
        ? `https://linkedin.com/in/${conv.participants[0]}`
        : undefined;

      await createProspect({
        name,
        platform: conv.provider,
        profile_url: profileUrl,
        notes: `Ajouté depuis la boîte unifiée (${conv.provider})`,
      });

      setAddedToCrm((prev) => new Set(prev).add(conv.id));
      toast.success(`${name} ajouté au CRM`);
    } catch {
      toast.error("Erreur lors de l'ajout au CRM");
    } finally {
      setAddingToCrm(false);
    }
  }

  async function handleSendMessage() {
    if (!replyText.trim() || !selectedConv || sending) return;
    const conv = conversations.find((c) => c.id === selectedConv);
    if (!conv || !conv.accountId) {
      toast.error("Impossible d'envoyer le message");
      return;
    }
    setSending(true);
    try {
      const result = await sendUnipileMessage({
        accountId: conv.accountId,
        recipientId: "",
        text: replyText.trim(),
        channel: conv.provider,
        chatId: conv.id,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        // Add message locally for instant feedback
        setMessages((prev) => [
          ...prev,
          {
            id: result.messageId || `local-${Date.now()}`,
            text: replyText.trim(),
            sender: "Moi",
            senderId: "self",
            timestamp: new Date().toISOString(),
            isFromMe: true,
          },
        ]);
        setReplyText("");
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setReplyText("");
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
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="shrink-0">
          <h2 className="text-base md:text-lg font-semibold">Boîte unifiée</h2>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
            {accounts.length} compte{accounts.length > 1 ? "s" : ""} connecté
            {accounts.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Platform tabs — full width */}
      <div className="flex items-center gap-1 border-b px-4 py-2 shrink-0">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePlatform(p.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
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

      {/* Two-column layout: sidebar (list) + message panel */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-row">
        {/* LEFT COLUMN: search + conversation list */}
        {(isDesktop || !selectedConv) && (
        <div
          className="flex flex-col border-r overflow-hidden shrink-0"
          style={{ width: isDesktop ? 320 : "100%" }}
        >
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
                {(() => {
                  // Show connect button only for the relevant platform filter
                  const platformToProvider: Record<string, string> = {
                    whatsapp: "WHATSAPP", linkedin: "LINKEDIN",
                    instagram: "INSTAGRAM", email: "MAIL",
                  };
                  const relevantMissing = activePlatform === "all"
                    ? missingProviders
                    : missingProviders.filter(
                        (b) => b.provider === platformToProvider[activePlatform],
                      );
                  return relevantMissing.length > 0 ? (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Connectez {activePlatform === "all" ? "vos comptes" : `votre compte ${activePlatform}`} pour voir vos conversations
                      </p>
                      <div className="flex flex-col gap-2">
                        {relevantMissing.map((b) => (
                          <Button
                            key={b.provider}
                            size="sm"
                            variant="outline"
                            className="text-xs h-8 gap-2 w-full"
                            disabled={connectingAccount}
                            onClick={() => handleConnectAccount(b.provider)}
                          >
                            {b.icon}
                            {b.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
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
                      <div className="relative shrink-0">
                        {conv.pictureUrl ? (
                          <img
                            src={conv.pictureUrl}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                            {(conv.participants[0] || "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background">
                          {platformIcon(conv.provider)}
                        </div>
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
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

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
                {missingProviders.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs text-muted-foreground mb-3">
                      Connectez vos comptes pour accéder à vos conversations
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {missingProviders.map((b) => (
                        <Button
                          key={b.provider}
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 gap-2"
                          disabled={connectingAccount}
                          onClick={() => handleConnectAccount(b.provider)}
                        >
                          {b.icon}
                          Connecter {b.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
            {/* Conversation header */}
            {(() => {
              const conv = conversations.find((c) => c.id === selectedConv);
              if (!conv) return null;
              const contactName = conv.participants.join(", ") || "Contact";
              const alreadyAdded = addedToCrm.has(conv.id);
              return (
                <div className="flex items-center gap-3 px-4 py-3 border-b">
                  {/* Back button (mobile only) */}
                  {!isDesktop && (
                    <button
                      onClick={() => setSelectedConv(null)}
                      className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  {/* Contact info */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      {conv.pictureUrl ? (
                        <img src={conv.pictureUrl} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                          {contactName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{contactName}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{conv.provider}</p>
                    </div>
                  </div>
                  {/* Add to CRM button */}
                  <Button
                    size="sm"
                    variant={alreadyAdded ? "ghost" : "outline"}
                    className="text-xs h-8 gap-1.5 shrink-0"
                    disabled={addingToCrm || alreadyAdded}
                    onClick={() => handleAddToCrm(conv)}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        Ajouté
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Ajouter au CRM
                      </>
                    )}
                  </Button>
                </div>
              );
            })()}
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
              <div ref={messagesEndRef} />
            </div>
            )}
            {/* Reply input */}
            <div className="border-t px-4 py-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Écrire un message..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-xl p-0"
                  disabled={!replyText.trim() || sending}
                  onClick={handleSendMessage}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
