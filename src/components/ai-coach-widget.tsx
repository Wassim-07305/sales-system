"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { askAiCoach, getCoachHistory } from "@/lib/actions/ai-coach";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export function AiCoachWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !historyLoaded) {
      async function fetchHistory() {
        try {
          const history = await getCoachHistory(5);
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
  }, [open, historyLoaded]);

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
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg hover:bg-emerald-400 transition-all",
          open && "rotate-90 scale-90",
        )}
        aria-label="Assistant IA"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-36 right-4 md:bottom-20 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-[360px] max-h-[500px] flex flex-col rounded-2xl border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Assistant IA</p>
                <p className="text-[10px] text-muted-foreground">
                  Coach setting & formation
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[340px]">
            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <Bot className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Pose-moi une question sur le setting, les scripts ou la
                  formation !
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
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-emerald-500 text-black rounded-br-md"
                      : "bg-muted rounded-bl-md",
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t flex items-center gap-2">
            <Input
              placeholder="Pose ta question..."
              className="flex-1 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              disabled={loading}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-emerald-500 text-black hover:bg-emerald-400 h-9 w-9 p-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
