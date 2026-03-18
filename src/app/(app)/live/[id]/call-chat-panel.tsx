"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";
import { X, Send } from "lucide-react";

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface CallChatPanelProps {
  sessionId: string;
  onClose: () => void;
}

export function CallChatPanel({ sessionId, onClose }: CallChatPanelProps) {
  const supabase = createClient();
  const { user, profile } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const myId = user?.id ?? "";
  const myName = profile?.full_name ?? "Utilisateur";

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Subscribe to broadcast
  useEffect(() => {
    const channel = supabase.channel(`live-chat-${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "chat-message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as ChatMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !myId) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: myId,
      senderName: myName,
      text: input.trim(),
      timestamp: Date.now(),
    };

    // Add locally
    setMessages((prev) => [...prev, msg]);

    // Broadcast to peer
    const channel = supabase.channel(`live-chat-${sessionId}`);
    channel.send({
      type: "broadcast",
      event: "chat-message",
      payload: msg,
    });

    setInput("");
  }, [input, myId, myName, sessionId, supabase]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-80 flex flex-col bg-card border-l border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground">Chat</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-8">
            Aucun message. Commencez la conversation !
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === myId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
            >
              {!isMe && (
                <span className="text-[10px] text-muted-foreground mb-0.5 ml-1">
                  {msg.senderName}
                </span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  isMe
                    ? "bg-[#7af17a]/20 text-[#7af17a]"
                    : "bg-muted text-foreground/90"
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5 mx-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            className="flex-1 h-9 rounded-xl bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[#7af17a]/50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-[#7af17a] text-zinc-900 flex items-center justify-center hover:bg-[#6ae06a] transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
