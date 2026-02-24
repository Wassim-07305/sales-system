"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { sendRoleplayMessage, endSession } from "@/lib/actions/roleplay";
import { cn } from "@/lib/utils";
import {
  Send,
  Square,
  Clock,
  User,
  Bot,
  Loader2,
  Eye,
  Linkedin,
  Instagram,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Profile {
  id: string;
  name: string;
  niche: string;
  persona: string;
  difficulty: string;
  network: string;
}

interface Session {
  id: string;
  status: string;
  started_at: string;
  conversation: Message[];
  profile: Profile | null;
}

interface Props {
  session: Session;
}

const difficultyColors: Record<string, string> = {
  Facile: "bg-green-100 text-green-700",
  Moyen: "bg-orange-100 text-orange-700",
  Difficile: "bg-red-100 text-red-700",
};

export function SessionView({ session }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(
    Array.isArray(session.conversation) ? session.conversation : []
  );
  const [input, setInput] = useState("");
  const [isSending, startSending] = useTransition();
  const [isEnding, startEnding] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCompleted = session.status === "completed";

  // Elapsed timer
  useEffect(() => {
    if (isCompleted) return;

    const startTime = new Date(session.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session.started_at, isCompleted]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function formatElapsed(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function handleSend() {
    const content = input.trim();
    if (!content || isCompleted) return;

    const userMsg: Message = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    startSending(async () => {
      try {
        const { aiMessage } = await sendRoleplayMessage(session.id, content);
        const aiMsg: Message = {
          role: "assistant",
          content: aiMessage,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch {
        toast.error("Erreur lors de l'envoi du message");
      }
    });
  }

  function handleEnd() {
    startEnding(async () => {
      try {
        await endSession(session.id);
        router.push(`/roleplay/debrief/${session.id}`);
      } catch {
        toast.error("Erreur lors de la fin de session");
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <Card className="mb-4 shrink-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h2 className="font-semibold">
                {session.profile?.name || "Prospect"}
              </h2>
              <div className="flex gap-2 mt-0.5">
                {session.profile?.niche && (
                  <Badge variant="outline" className="text-[10px]">
                    {session.profile.niche}
                  </Badge>
                )}
                {session.profile?.difficulty && (
                  <Badge
                    className={`${difficultyColors[session.profile.difficulty] || ""} border-0 text-[10px]`}
                  >
                    {session.profile.difficulty}
                  </Badge>
                )}
                {session.profile?.network && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    {session.profile.network === "LinkedIn" ? (
                      <Linkedin className="h-3 w-3" />
                    ) : (
                      <Instagram className="h-3 w-3" />
                    )}
                    {session.profile.network}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatElapsed(elapsed)}
            </div>
            {isCompleted ? (
              <Link href={`/roleplay/debrief/${session.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le d\u00e9briefing
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnd}
                disabled={isEnding}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                {isEnding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-2" />
                )}
                Terminer
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Messages */}
      <Card className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Intro message */}
            {messages.length === 0 && !isCompleted && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">La session a commenc\u00e9 !</p>
                <p className="text-sm mt-1">
                  Envoyez votre premier message pour d\u00e9marrer la conversation avec{" "}
                  {session.profile?.name || "le prospect"}.
                </p>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={cn("flex gap-3", isUser && "flex-row-reverse")}
                >
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      isUser
                        ? "bg-brand/10 text-brand"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isUser ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div className={cn("max-w-[75%]", isUser && "text-right")}>
                    <div
                      className={cn(
                        "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                        isUser
                          ? "bg-brand-dark text-white rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      {msg.content}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 px-1">
                      {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        {!isCompleted && (
          <div className="p-4 border-t">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre message..."
                className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                rows={1}
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isSending}
                className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
