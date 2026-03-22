"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { askAiCoach, getCoachHistory } from "@/lib/actions/ai-coach";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface AiChatPanelProps {
  onBack?: () => void;
}

export function AiChatPanel({ onBack }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!historyLoaded) {
      async function fetchHistory() {
        try {
          const history = await getCoachHistory(10);
          if (history.length > 0) {
            const restored: Message[] = [];
            for (const h of history.reverse()) {
              restored.push({ id: h.id, role: "user", content: h.question });
              if (h.answer) {
                restored.push({
                  id: h.id + "-a",
                  role: "assistant",
                  content: h.answer,
                });
              }
            }
            setMessages(restored);
          }
          setHistoryLoaded(true);
        } catch {
          setHistoryLoaded(true);
        }
      }
      fetchHistory();
    }
  }, [historyLoaded]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const result = await askAiCoach(question);
      if (result.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.error || "Erreur inconnue" },
        ]);
      } else if (result.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer! },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Une erreur est survenue. Réessaie dans quelques instants.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 shrink-0">
          <Bot className="h-5 w-5 text-brand" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">Assistant IA</h3>
          <p className="text-[11px] text-muted-foreground">
            Coach setting & formation
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-brand">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          En ligne
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-brand" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Assistant IA</h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Pose-moi une question sur le setting, les scripts, la prospection
              ou la formation. Je suis là pour t&apos;aider !
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div className="flex items-end gap-2 max-w-[80%]">
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0 mb-0.5">
                  <Bot className="h-3.5 w-3.5 text-brand" />
                </div>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md",
                )}
              >
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-brand" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0.2s]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 shrink-0">
        <div className="flex items-center gap-2">
          <textarea
            placeholder="Pose ta question..."
            className="flex-1 resize-none rounded-xl border bg-muted/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 min-h-[40px] max-h-[120px]"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-10 w-10 rounded-xl p-0 shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
