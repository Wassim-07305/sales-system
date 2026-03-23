"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Square,
  SkipForward,
  Sparkles,
  Loader2,
  Send,
  Copy,
  Check,
  Clock,
  MessageCircle,
  Users,
  Linkedin,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  startSession,
  endSession,
  generateAiComments,
  publishComment,
  type LinkedInFeed,
  type FeedPost,
  type AiComment,
  type FeedProfile,
} from "@/lib/actions/linkedin-engage";

interface Props {
  feeds: LinkedInFeed[];
  posts: FeedPost[];
}

type SessionState = "setup" | "active" | "summary";

export function SessionView({ feeds, posts }: Props) {
  const router = useRouter();
  const [state, setState] = useState<SessionState>("setup");
  const [selectedFeedId, setSelectedFeedId] = useState("all");
  const [durationMinutes, setDurationMinutes] = useState(10);

  // Active session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [commentsPosted, setCommentsPosted] = useState(0);
  const [profilesEngaged, setProfilesEngaged] = useState(new Set<string>());
  const [feedsBrowsed, setFeedsBrowsed] = useState(new Set<string>());

  // AI comments for current post
  const [aiComments, setAiComments] = useState<AiComment[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredPosts =
    selectedFeedId === "all"
      ? posts
      : posts.filter((p) => p.feed_id === selectedFeedId);

  const currentPost = filteredPosts[currentIdx] || null;

  // Timer
  useEffect(() => {
    if (state !== "active" || isPaused) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isPaused]);

  const handleEnd = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState("summary");

    if (sessionId) {
      try {
        await endSession(sessionId, {
          comments_posted: commentsPosted,
          feeds_browsed: feedsBrowsed.size,
          profiles_engaged: profilesEngaged.size,
        });
      } catch {
        // Non-critical
      }
    }
  }, [sessionId, commentsPosted, feedsBrowsed, profilesEngaged]);

  async function handleStart() {
    try {
      const session = await startSession(durationMinutes * 60);
      if (session) {
        setSessionId(session.id);
        setTimeLeft(durationMinutes * 60);
        setCurrentIdx(0);
        setCommentsPosted(0);
        setProfilesEngaged(new Set());
        setFeedsBrowsed(new Set());
        setAiComments([]);
        setState("active");

        // Auto-generate for first post
        if (filteredPosts[0]) {
          autoGenerate(filteredPosts[0].id);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function autoGenerate(postId: string) {
    setGenerating(true);
    try {
      const comments = await generateAiComments(postId);
      setAiComments(comments);
    } catch {
      toast.error("Erreur de génération");
    } finally {
      setGenerating(false);
    }
  }

  function handleNext() {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= filteredPosts.length) {
      handleEnd();
      return;
    }
    setCurrentIdx(nextIdx);
    setAiComments([]);

    const nextPost = filteredPosts[nextIdx];
    if (nextPost) {
      setFeedsBrowsed((prev) => new Set(prev).add(nextPost.feed_id));
      autoGenerate(nextPost.id);
    }
  }

  async function handlePublish(comment: AiComment) {
    if (!currentPost) return;
    setPublishingId(comment.id);
    try {
      const profileData = currentPost.profile as FeedProfile | undefined;
      const result = await publishComment(
        comment.id,
        currentPost.post_url || "",
        comment.comment_text,
        profileData?.full_name || "Créateur",
      );
      if (result.success) {
        setCommentsPosted((prev) => prev + 1);
        if (profileData?.full_name) {
          setProfilesEngaged((prev) =>
            new Set(prev).add(profileData.full_name || ""),
          );
        }
        setAiComments((prev) =>
          prev.map((c) =>
            c.id === comment.id ? { ...c, status: "published" as const } : c,
          ),
        );
        toast.success("Publié !");
      } else {
        toast.error(result.error || "Erreur");
      }
    } catch {
      toast.error("Erreur de publication");
    } finally {
      setPublishingId(null);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ---- SETUP ----
  if (state === "setup") {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-12">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Play className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Session de commentaires</h1>
          <p className="text-muted-foreground">
            Commentez des posts LinkedIn en mode focus, sans distraction
          </p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Feed</label>
              <Select value={selectedFeedId} onValueChange={setSelectedFeedId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Tous les feeds ({posts.length} posts)
                  </SelectItem>
                  {feeds.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Durée</label>
              <Select
                value={String(durationMinutes)}
                onValueChange={(v) => setDurationMinutes(parseInt(v))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleStart}
              disabled={filteredPosts.length === 0}
              className="w-full rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 h-12 text-base"
            >
              <Play className="h-5 w-5 mr-2" />
              Démarrer la session
            </Button>

            {filteredPosts.length === 0 && (
              <p className="text-xs text-center text-destructive">
                Aucun post dans les feeds sélectionnés. Ajoutez des profils et
                scrapez les posts d&apos;abord.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- SUMMARY ----
  if (state === "summary") {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-12">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Session terminée !</h1>
          <p className="text-muted-foreground">Voici votre résumé</p>
        </div>

        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-emerald-500">
                  {commentsPosted}
                </p>
                <p className="text-xs text-muted-foreground">Commentaires</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{profilesEngaged.size}</p>
                <p className="text-xs text-muted-foreground">Profils</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{feedsBrowsed.size}</p>
                <p className="text-xs text-muted-foreground">Feeds</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            onClick={() => {
              setState("setup");
              setAiComments([]);
            }}
            className="flex-1 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
          >
            Nouvelle session
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/prospecting/engage")}
            className="flex-1 rounded-xl"
          >
            Retour au dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ---- ACTIVE SESSION ----
  const profileData = currentPost?.profile as FeedProfile | undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-4">
      {/* Timer bar */}
      <div className="flex items-center justify-between bg-card rounded-2xl p-4 shadow-sm border">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-mono font-bold tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-lg"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-lg text-destructive"
              onClick={handleEnd}
            >
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            <span className="font-bold">{commentsPosted}</span>
          </span>
          <span className="text-muted-foreground">
            {currentIdx + 1}/{filteredPosts.length}
          </span>
        </div>
      </div>

      {/* Current post */}
      {currentPost ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6">
            {/* Author */}
            <div className="flex items-center gap-3 mb-4">
              {profileData?.photo_url ? (
                <img
                  src={profileData.photo_url}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-lg font-bold text-emerald-500">
                  {(profileData?.full_name || "?")[0]}
                </div>
              )}
              <div>
                <p className="font-semibold">
                  {profileData?.full_name || "Créateur"}
                </p>
                {profileData?.job_title && (
                  <p className="text-sm text-muted-foreground">
                    {profileData.job_title}
                  </p>
                )}
              </div>
            </div>

            {/* Post text */}
            <p className="text-sm whitespace-pre-wrap mb-4">
              {currentPost.content_text || "[Post sans texte]"}
            </p>

            {currentPost.post_image_url && (
              <img
                src={currentPost.post_image_url}
                alt=""
                className="rounded-xl max-h-48 object-cover w-full mb-4"
              />
            )}

            {/* AI comments */}
            {generating ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Génération en cours...</span>
              </div>
            ) : aiComments.length > 0 ? (
              <div className="space-y-3 border-t pt-4">
                {aiComments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-xl border ${
                      comment.status === "published"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {comment.comment_type === "value"
                          ? "Valeur"
                          : comment.comment_type === "question"
                            ? "Question"
                            : "Témoignage"}
                      </Badge>
                      {comment.status === "published" && (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                          Publié
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap mb-2">
                      {comment.comment_text}
                    </p>
                    {comment.status !== "published" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 h-8"
                          disabled={publishingId === comment.id}
                          onClick={() => handlePublish(comment)}
                        >
                          {publishingId === comment.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Publier
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg h-8"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              comment.comment_text,
                            );
                            setCopiedId(comment.id);
                            toast.success("Copié");
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                          {copiedId === comment.id ? (
                            <Check className="h-3 w-3 mr-1 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copier
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <Button
                onClick={() => autoGenerate(currentPost.id)}
                className="w-full rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Générer des commentaires
              </Button>
            )}

            {/* Next button */}
            <div className="mt-4 pt-4 border-t">
              <Button
                onClick={handleNext}
                variant="outline"
                className="w-full rounded-xl"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Post suivant
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Plus de posts à commenter</p>
            <Button onClick={handleEnd} className="mt-4 rounded-xl">
              Terminer la session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
