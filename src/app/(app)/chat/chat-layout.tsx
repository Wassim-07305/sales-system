"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { markChannelAsRead } from "@/lib/actions/communication";

interface ChatLayoutProps {
  initialChannels: Channel[];
  currentUserId: string;
  initialUnreadCounts: Record<string, number>;
}

const channelIcons = {
  group: Hash,
  direct: MessageCircle,
  announcement: Megaphone,
};

export function ChatLayout({ initialChannels, currentUserId, initialUnreadCounts }: ChatLayoutProps) {
  // Stable supabase client reference
  const supabase = useMemo(() => createClient(), []);

  const [channels] = useState<Channel[]>(initialChannels);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(
    initialChannels[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(initialUnreadCounts);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Mark channel as read on open
    markChannelAsRead(activeChannel.id).then(() => {
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[activeChannel!.id];
        return next;
      });
    });

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
            // Keep read status current while viewing the channel
            markChannelAsRead(activeChannel!.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChannel, supabase, scrollToBottom]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image doit faire moins de 10 Mo");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `chat/${currentUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      setImagePreview(data.publicUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && !imageUrl) || !activeChannel) return;

    if (imageUrl) {
      // Send image message
      await supabase.from("messages").insert({
        channel_id: activeChannel.id,
        sender_id: currentUserId,
        content: newMessage.trim() || "",
        message_type: "image",
        file_url: imageUrl,
      });
      setImageUrl(null);
      setImagePreview(null);
    } else {
      const { error } = await supabase.from("messages").insert({
        channel_id: activeChannel.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
        message_type: "text",
      });
      if (error) {
        toast.error("Erreur lors de l'envoi");
        return;
      }
    }

    setNewMessage("");
  }

  // TODO: support envoi de messages vocaux (enregistrement micro + upload audio)

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
              const Icon = channelIcons[channel.type as keyof typeof channelIcons] || Hash;
              const unread = unreadCounts[channel.id] || 0;
              return (
                <button
                  key={channel.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                    activeChannel?.id === channel.id
                      ? "bg-brand/10 text-brand-dark font-medium"
                      : unread > 0
                        ? "text-foreground font-semibold hover:bg-muted"
                        : "text-muted-foreground hover:bg-muted"
                  )}
                  onClick={() => setActiveChannel(channel)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{channel.name}</span>
                  {unread > 0 && (
                    <Badge
                      variant="default"
                      className="bg-brand text-brand-dark text-[10px] h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full"
                    >
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
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
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Chargement...
                </div>
              ) : (
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
                          {message.message_type === "image" && message.file_url ? (
                            <img
                              src={message.file_url}
                              alt="Image"
                              className="rounded-xl max-h-60 max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.file_url!, "_blank")}
                            />
                          ) : (
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
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Image preview */}
            {imagePreview && (
              <div className="px-4 pb-2">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Aperçu" className="h-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImagePreview(null); setImageUrl(null); }}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="p-4 border-t">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                {/* TODO: support envoi de messages vocaux */}
                <Button type="button" variant="ghost" size="icon" className="shrink-0" disabled>
                  <Mic className="h-4 w-4 opacity-40" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
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
                  disabled={!newMessage.trim() && !imageUrl}
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
