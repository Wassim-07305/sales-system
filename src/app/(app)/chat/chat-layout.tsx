"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { Channel, Message } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  Send,
  Hash,
  MessageCircle,
  Megaphone,
  Paperclip,
  Mic,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ChatLayoutProps {
  initialChannels: Channel[];
  currentUserId: string;
}

const channelIcons = {
  group: Hash,
  direct: MessageCircle,
  announcement: Megaphone,
};

export function ChatLayout({ initialChannels, currentUserId }: ChatLayoutProps) {
  const [channels] = useState<Channel[]>(initialChannels);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(
    initialChannels[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load messages for active channel
  useEffect(() => {
    if (!activeChannel) return;

    async function loadMessages() {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles(*)")
        .eq("channel_id", activeChannel!.id)
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(data || []);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
    }

    loadMessages();

    // Subscribe to realtime messages
    const subscription = supabase
      .channel(`messages:${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        async (payload) => {
          const { data: fullMessage } = await supabase
            .from("messages")
            .select("*, sender:profiles(*)")
            .eq("id", payload.new.id)
            .single();

          if (fullMessage) {
            setMessages((prev) => [...prev, fullMessage]);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChannel, supabase, scrollToBottom]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    const { error } = await supabase.from("messages").insert({
      channel_id: activeChannel.id,
      sender_id: currentUserId,
      content: newMessage.trim(),
      message_type: "text",
    });

    if (!error) {
      setNewMessage("");
    }
  }

  const filteredChannels = channels.filter(
    (c) =>
      !channelSearch ||
      c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Channel list */}
      <Card className="w-72 flex-shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredChannels.map((channel) => {
              const Icon = channelIcons[channel.type] || Hash;
              return (
                <button
                  key={channel.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                    activeChannel?.id === channel.id
                      ? "bg-brand/10 text-brand-dark font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setActiveChannel(channel)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
            {filteredChannels.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun channel
              </p>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Messages area */}
      <Card className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-2 p-4 border-b">
              <Hash className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">{activeChannel.name}</h2>
              {activeChannel.description && (
                <span className="text-sm text-muted-foreground">
                  — {activeChannel.description}
                </span>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender_id === currentUserId;
                  return (
                    <div
                      key={message.id}
                      className={cn("flex gap-3", isOwn && "flex-row-reverse")}
                    >
                      <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                        {message.sender?.full_name?.charAt(0) || "?"}
                      </div>
                      <div
                        className={cn(
                          "max-w-[70%]",
                          isOwn && "text-right"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium">
                            {message.sender?.full_name || "Inconnu"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {format(
                              new Date(message.created_at),
                              "HH:mm",
                              { locale: fr }
                            )}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "inline-block rounded-2xl px-4 py-2 text-sm",
                            isOwn
                              ? "bg-brand-dark text-white rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <Button type="button" variant="ghost" size="icon" className="shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="shrink-0">
                  <Mic className="h-4 w-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message dans #${activeChannel.name}...`}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Sélectionnez un channel pour commencer
          </div>
        )}
      </Card>
    </div>
  );
}
