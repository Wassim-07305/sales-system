"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  sendRoleplayMessage,
  endSession,
  getRoleplayFeedback,
} from "@/lib/actions/roleplay";
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
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
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

interface Feedback {
  score: number;
  strengths: string[];
  improvements: string[];
  tips: string[];
}

interface Props {
  session: Session;
}

const difficultyColors: Record<string, string> = {
  Facile: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Moyen: "bg-muted/60 text-muted-foreground border-border",
  Difficile: "bg-foreground/10 text-foreground border-border",
};

export function SessionView({ session }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(
    Array.isArray(session.conversation) ? session.conversation : [],
  );
  const [input, setInput] = useState("");
  const [isSending, startSending] = useTransition();
  const [isEnding, startEnding] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isFeedbackLoading, startFeedbackLoading] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCompleted = session.status === "completed" || feedback !== null;

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

  function handleFeedback() {
    startFeedbackLoading(async () => {
      try {
        const conversation = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));
        const result = await getRoleplayFeedback(session.id, conversation);
        setFeedback(result);
        toast.success("Feedback genere avec succes !");
      } catch {
        toast.error("Erreur lors de la generation du feedback");
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
    <div className="flex flex-col h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)]">
      {/* Header */}
      <Card className="mb-4 shrink-0">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <Bot className="h-5 w-5 text-emerald-500" />
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
                    variant="outline"
                    className={`${difficultyColors[session.profile.difficulty] || ""} text-[10px]`}
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
            {isCompleted && !feedback ? (
              <Link href={`/roleplay/debrief/${session.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le debriefing
                </Button>
              </Link>
            ) : feedback ? (
              <Link href={`/roleplay/debrief/${session.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Debriefing complet
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnd}
                  disabled={isEnding || isFeedbackLoading}
                  className="text-destructive border-border hover:bg-muted hover:text-destructive"
                >
                  {isEnding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  Terminer
                </Button>
                {messages.length >= 2 && (
                  <Button
                    size="sm"
                    onClick={handleFeedback}
                    disabled={isFeedbackLoading || isEnding}
                    className="bg-emerald-500 text-black hover:bg-emerald-400"
                  >
                    {isFeedbackLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trophy className="h-4 w-4 mr-2" />
                    )}
                    Terminer &amp; obtenir le feedback
                  </Button>
                )}
              </div>
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
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <Bot className="h-7 w-7 opacity-50" />
                </div>
                <p className="font-medium">La session a commencé !</p>
                <p className="text-sm mt-1">
                  Envoyez votre premier message pour démarrer la conversation
                  avec {session.profile?.name || "le prospect"}.
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
                      "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                      isUser
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground",
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
                          ? "bg-emerald-500 text-white rounded-br-md"
                          : "bg-muted rounded-bl-md",
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
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
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
                className="bg-emerald-500 text-black hover:bg-emerald-400 shrink-0"
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

      {/* Inline Feedback Panel */}
      {feedback && (
        <Card className="mt-4 shrink-0">
          <div className="p-6 space-y-6">
            {/* Score */}
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "h-16 w-16 rounded-full border-3 flex flex-col items-center justify-center shrink-0",
                  feedback.score >= 80
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                    : feedback.score >= 60
                      ? "text-muted-foreground border-border bg-muted/60"
                      : "text-foreground border-border bg-foreground/10",
                )}
              >
                <span className="text-xl font-bold">{feedback.score}</span>
                <span className="text-[9px] opacity-70">/100</span>
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-500" />
                  Feedback de la session
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {feedback.score >= 80
                    ? "Excellente performance !"
                    : feedback.score >= 60
                      ? "Bonne session, quelques axes d'amelioration."
                      : "Session d'entrainement — continue a progresser !"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Strengths */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Points forts
                </h4>
                <ul className="space-y-1.5">
                  {feedback.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Axes d&apos;amelioration
                </h4>
                <ul className="space-y-1.5">
                  {feedback.improvements.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tips */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4" />
                  Conseils pratiques
                </h4>
                <ul className="space-y-1.5">
                  {feedback.tips.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-foreground mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href={`/roleplay/debrief/${session.id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Voir le debriefing complet
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
