"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Radio,
  Plus,
  Video,
  Monitor,
  Users,
  Clock,
  Trash2,
  Play,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createLiveSession, deleteLiveSession } from "@/lib/actions/live";
import type {
  Profile,
  LiveSession,
  LiveSessionType,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface LiveHubViewProps {
  sessions: LiveSession[];
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  }[];
  currentUser: Profile;
}

export function LiveHubView({
  sessions,
  profiles,
  currentUser,
}: LiveHubViewProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState<LiveSessionType>("one_on_one");
  const [guestId, setGuestId] = useState("");

  const isAdmin =
    currentUser.role === "admin" || currentUser.role === "manager";

  const liveSessions = sessions.filter((s) => s.status === "live");
  const scheduledSessions = sessions.filter((s) => s.status === "scheduled");
  const endedSessions = sessions
    .filter((s) => s.status === "ended")
    .slice(0, 10);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Le titre est requis");
      return;
    }

    setCreating(true);
    try {
      const session = await createLiveSession({
        title: title.trim(),
        description: description.trim() || undefined,
        session_type: sessionType,
        guest_id: guestId || undefined,
      });
      toast.success("Session creee !");
      setShowCreate(false);
      setTitle("");
      setDescription("");
      setSessionType("one_on_one");
      setGuestId("");
      router.refresh();
      router.push(`/live/${session.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la creation",
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteLiveSession(id);
      toast.success("Session supprimee");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setDeleting(null);
    }
  };

  const sessionTypeOptions: {
    value: LiveSessionType;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      value: "one_on_one",
      label: "Appel 1-to-1",
      icon: <Video className="w-5 h-5" />,
      desc: "Appel video prive avec un participant",
    },
    {
      value: "live",
      label: "Live",
      icon: <Radio className="w-5 h-5" />,
      desc: "Session live ouverte",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Radio className="w-7 h-7 text-[#7af17a]" />
              Live
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Appels video, partage d&apos;ecran et sessions live
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="h-10 px-4 rounded-xl bg-[#7af17a] text-zinc-900 text-sm font-semibold hover:bg-[#6ae06a] transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouvelle session
            </button>
          )}
        </div>

        {/* Live now */}
        {liveSessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              En direct
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {liveSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isLive
                  onJoin={() => router.push(`/live/${s.id}`)}
                  onDelete={isAdmin ? () => handleDelete(s.id) : undefined}
                  deleting={deleting === s.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Scheduled */}
        {scheduledSessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Planifiees
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {scheduledSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onJoin={() => router.push(`/live/${s.id}`)}
                  onDelete={isAdmin ? () => handleDelete(s.id) : undefined}
                  deleting={deleting === s.id}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {liveSessions.length === 0 && scheduledSessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
              <Radio className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              Aucune session active
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              {isAdmin
                ? "Creez une nouvelle session pour demarrer un appel video ou un live."
                : "Aucune session live en cours. Revenez plus tard."}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 h-10 px-4 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Creer une session
              </button>
            )}
          </div>
        )}

        {/* Past sessions */}
        {endedSessions.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
              Sessions passees
            </h2>
            <div className="space-y-2">
              {endedSessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <SessionTypeIcon
                      type={s.session_type}
                      className="text-zinc-600"
                    />
                    <div>
                      <p className="text-sm text-zinc-400">{s.title}</p>
                      <p className="text-xs text-zinc-600">
                        {s.host?.full_name}
                        {s.actual_duration_seconds
                          ? ` · ${Math.floor(s.actual_duration_seconds / 60)} min`
                          : ""}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors"
                    >
                      {deleting === s.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 max-w-md mx-4 shadow-2xl w-full">
            <h3 className="text-lg font-semibold text-white mb-4">
              Nouvelle session
            </h3>

            <div className="space-y-4">
              {/* Session type */}
              <div className="grid grid-cols-2 gap-2">
                {sessionTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSessionType(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center",
                      sessionType === opt.value
                        ? "border-[#7af17a]/50 bg-[#7af17a]/10 text-[#7af17a]"
                        : "border-white/5 bg-zinc-800/50 text-zinc-400 hover:border-white/10",
                    )}
                  >
                    {opt.icon}
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Titre
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Session coaching"
                  className="w-full h-10 px-3 rounded-xl bg-zinc-800 border border-white/5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#7af17a]/50"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Details de la session..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-white/5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-[#7af17a]/50 resize-none"
                />
              </div>

              {/* Guest */}
              {sessionType === "one_on_one" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Participant
                  </label>
                  <select
                    value={guestId}
                    onChange={(e) => setGuestId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-800 border border-white/5 text-white text-sm focus:outline-none focus:border-[#7af17a]/50"
                  >
                    <option value="">Choisir un participant...</option>
                    {profiles
                      .filter((p) => p.id !== currentUser.id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name ?? p.id} ({p.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 h-10 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="flex-1 h-10 rounded-xl bg-[#7af17a] text-zinc-900 text-sm font-semibold hover:bg-[#6ae06a] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creation...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Demarrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  isLive,
  onJoin,
  onDelete,
  deleting,
}: {
  session: LiveSession;
  isLive?: boolean;
  onJoin: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-4 rounded-2xl border transition-all group",
        isLive
          ? "bg-zinc-900 border-red-500/20 hover:border-red-500/40"
          : "bg-zinc-900/50 border-white/5 hover:border-white/10",
      )}
    >
      {isLive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-600/20">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-medium text-red-400 uppercase tracking-wider">
            Live
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isLive ? "bg-red-600/20 text-red-400" : "bg-zinc-800 text-zinc-400",
          )}
        >
          <SessionTypeIcon type={session.session_type} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">
            {session.title}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {session.host?.full_name ?? "Hote"}
            {session.guest?.full_name ? ` → ${session.guest.full_name}` : ""}
          </p>
          {session.description && (
            <p className="text-xs text-zinc-600 mt-1 line-clamp-2">
              {session.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={onJoin}
          className={cn(
            "flex-1 h-9 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
            isLive
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-[#7af17a] text-zinc-900 hover:bg-[#6ae06a]",
          )}
        >
          {isLive ? (
            <>
              <Radio className="w-3.5 h-3.5" />
              Rejoindre
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              Demarrer
            </>
          )}
        </button>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            disabled={deleting}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-600/10 transition-colors border border-white/5"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SessionTypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  switch (type) {
    case "one_on_one":
      return <Video className={cn("w-5 h-5", className)} />;
    case "screen_share":
      return <Monitor className={cn("w-5 h-5", className)} />;
    case "live":
      return <Radio className={cn("w-5 h-5", className)} />;
    default:
      return <Users className={cn("w-5 h-5", className)} />;
  }
}
