"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Loader2,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { askAiCoach, getCoachHistory } from "@/lib/actions/ai-coach";

const SUGGESTED_QUESTIONS = [
  "Comment rédiger un bon message de prospection ?",
  "Quelles sont les meilleures objections à traiter ?",
  "Comment relancer un prospect qui ne répond pas ?",
  "Donne-moi un script de premier message LinkedIn",
];

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  feedback?: "positive" | "negative";
}

interface AiChatPanelProps {
  onBack?: () => void;
}

/** Basic markdown rendering for AI responses */
function renderMarkdown(text: string) {
  // Split by code blocks first
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const code = part.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      return (
        <pre
          key={i}
          className="my-2 rounded-lg bg-background/80 border p-3 text-xs overflow-x-auto font-mono"
        >
          {code}
        </pre>
      );
    }
    // Process inline markdown
    return (
      <span key={i}>
        {part.split("\n").map((line, j) => {
          // Headers
          if (line.startsWith("### "))
            return (
              <strong key={j} className="block text-sm font-semibold mt-2 mb-1">
                {line.slice(4)}
              </strong>
            );
          if (line.startsWith("## "))
            return (
              <strong key={j} className="block text-sm font-bold mt-2 mb-1">
                {line.slice(3)}
              </strong>
            );
          // Bullet points
          if (line.match(/^[-*] /))
            return (
              <span key={j} className="block pl-3 relative">
                <span className="absolute left-0">•</span>
                {processInline(line.slice(2))}
              </span>
            );
          // Numbered lists
          if (line.match(/^\d+\. /))
            return (
              <span key={j} className="block pl-4">
                {processInline(line)}
              </span>
            );
          // Empty lines
          if (!line.trim()) return <br key={j} />;
          // Regular text
          return (
            <span key={j} className="block">
              {processInline(line)}
            </span>
          );
        })}
      </span>
    );
  });
}

function processInline(text: string): React.ReactNode[] {
  // Parse inline markdown into safe React elements
  const tokens: React.ReactNode[] = [];
  // Regex to match **bold**, *italic*, and `code`
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Push text before match
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      // Bold
      tokens.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      // Italic
      tokens.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      // Inline code
      tokens.push(
        <code key={match.index} className="rounded bg-background/80 px-1 py-0.5 text-xs font-mono">
          {match[4]}
        </code>,
      );
    }
    lastIndex = match.index + match[0].length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

export function AiChatPanel({ onBack }: AiChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!historyLoaded) {
      async function fetchHistory() {
        setHistoryLoading(true);
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
        } finally {
          setHistoryLoading(false);
        }
      }
      fetchHistory();
    }
  }, [historyLoaded]);

  const handleSend = useCallback(
    async (question?: string) => {
      const q = (question || input).trim();
      if (!q || loading) return;
      setInput("");
      setMessages((prev) => [...prev, { role: "user", content: q }]);
      setLoading(true);

      try {
        const result = await askAiCoach(q);
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
            content:
              "Une erreur est survenue. Réessaie dans quelques instants.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading],
  );

  const handleRegenerate = useCallback(async () => {
    // Find last user message
    const lastUserIdx = [...messages]
      .reverse()
      .findIndex((m) => m.role === "user");
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[messages.length - 1 - lastUserIdx];

    // Remove last assistant message
    setMessages((prev) => {
      const newMsgs = [...prev];
      // Remove from the end until we hit the last user message
      while (
        newMsgs.length > 0 &&
        newMsgs[newMsgs.length - 1].role === "assistant"
      ) {
        newMsgs.pop();
      }
      return newMsgs;
    });

    // Re-ask
    await handleSend(lastUserMsg.content);
  }, [messages, handleSend]);

  const handleFeedback = useCallback(
    (index: number, type: "positive" | "negative") => {
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === index
            ? { ...msg, feedback: msg.feedback === type ? undefined : type }
            : msg,
        ),
      );
    },
    [],
  );

  const handleClearHistory = useCallback(() => {
    setMessages([]);
  }, []);

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
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 shrink-0">
          <Bot className="h-5 w-5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">Assistant IA</h3>
          <p className="text-[11px] text-muted-foreground">
            Coach setting & formation
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            En ligne
          </span>
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="rounded-lg p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Effacer la conversation"
              aria-label="Effacer la conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* History loading */}
        {historyLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state with suggestions */}
        {!historyLoading && messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-sm font-semibold mb-1">Assistant IA</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-6">
              Pose-moi une question sur le setting, les scripts, la prospection
              ou la formation.
            </p>
            <div className="w-full max-w-sm space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Suggestions
              </p>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left rounded-xl border px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 hover:border-primary/30 transition-all flex items-center gap-3"
                >
                  <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div key={i}>
            <div
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div className="flex items-end gap-2 max-w-[80%]">
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mb-0.5">
                    <Bot className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                )}
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                      : "bg-muted rounded-bl-md",
                  )}
                >
                  {msg.role === "assistant"
                    ? renderMarkdown(msg.content)
                    : msg.content}
                </div>
              </div>
            </div>

            {/* Feedback + Regenerate for assistant messages */}
            {msg.role === "assistant" && (
              <div className="flex items-center gap-1 ml-9 mt-1">
                <button
                  onClick={() => handleFeedback(i, "positive")}
                  className={cn(
                    "rounded-lg p-1 transition-colors",
                    msg.feedback === "positive"
                      ? "text-emerald-500 bg-emerald-500/10"
                      : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted",
                  )}
                  title="Utile"
                  aria-label="Réponse utile"
                >
                  <ThumbsUp className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleFeedback(i, "negative")}
                  className={cn(
                    "rounded-lg p-1 transition-colors",
                    msg.feedback === "negative"
                      ? "text-destructive bg-destructive/10"
                      : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted",
                  )}
                  title="Pas utile"
                  aria-label="Réponse pas utile"
                >
                  <ThumbsDown className="h-3 w-3" />
                </button>
                {i === messages.length - 1 && (
                  <button
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="rounded-lg p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    title="Régénérer la réponse"
                    aria-label="Régénérer la réponse"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-emerald-500" />
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
            onClick={() => handleSend()}
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
