"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import type { Channel, Message, UserRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  Send,
  Hash,
  Megaphone,
  Paperclip,
  Search,
  X,
  Loader2,
  Plus,
  MoreVertical,
  Trash2,
  Users,
  MessageSquare,
  SmilePlus,
  Pencil,
  ChevronDown,
  UserPlus,
  AtSign,
  ArrowLeft,
  Reply,
  Phone,
  Inbox,
  Instagram,
  Linkedin,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Circle,
  Sparkles,
  Mic,
  Square,
  Play,
  Pause,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  createChannel,
  deleteChannel,
  updateChannelMembers,
  getChannelMembers,
  getAllUsers,
} from "@/lib/actions/chat-admin";
import {
  getOrCreateDM,
  editMessage as editMessageAction,
  deleteMessage as deleteMessageAction,
  searchMessages,
} from "@/lib/actions/communication";
import { sendWhatsAppMessage } from "@/lib/actions/whatsapp";
import {
  generateUnipileAuthLink,
  getUnipileStatus,
} from "@/lib/actions/unipile";
import { usePresence } from "@/lib/hooks/use-presence";
import { TypingIndicator } from "@/components/typing-indicator";
import { OnlineStatus } from "@/components/online-status";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WAConversation {
  prospect_id: string;
  prospect: {
    id: string;
    name: string;
    platform?: string;
    profile_url?: string;
    status?: string;
  } | null;
  messages: WAMessage[];
  last_message_at: string;
  unread_count: number;
}

interface WAMessage {
  id: string;
  direction: string;
  content: string;
  media_url?: string | null;
  status: string;
  created_at: string;
}

interface SocialConversation {
  id: string;
  prospect_id: string;
  prospect: {
    id: string;
    name: string;
    platform?: string;
    profile_url?: string;
  } | null;
  platform: string;
  messages: SocialMessage[];
  last_message_at: string;
  unread_count: number;
}

interface SocialMessage {
  sender: string;
  content: string;
  type: string;
  timestamp: string;
}

interface ChatLayoutProps {
  initialChannels: Channel[];
  currentUserId: string;
  initialUnreadCounts: Record<string, number>;
  userRole: UserRole;
  teamMembers: TeamMember[];
  initialWAConversations: WAConversation[];
  initialLinkedinConversations: SocialConversation[];
  initialInstagramConversations: SocialConversation[];
  unipileWhatsApp?: { connected: boolean; accountName?: string } | null;
  unipileLinkedin?: { connected: boolean; accountName?: string } | null;
  unipileInstagram?: { connected: boolean; accountName?: string } | null;
}

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

interface RawReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  user_name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const QUICK_EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🎉",
  "🔥",
  "👀",
  "🙏",
  "✅",
  "💯",
  "👏",
];
const ADMIN_ROLES: UserRole[] = ["admin", "manager"];
const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Aujourd’hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE d MMMM yyyy", { locale: fr });
}

function shouldGroup(prev: Message, curr: Message): boolean {
  if (prev.sender_id !== curr.sender_id) return false;
  const diff =
    new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime();
  return diff < 5 * 60 * 1000;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
  "from-fuchsia-500 to-purple-600",
  "from-sky-500 to-blue-600",
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return `bg-gradient-to-br ${AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]}`;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return format(new Date(dateStr), "HH:mm");
  if (diff < 604800000) return format(new Date(dateStr), "EEE", { locale: fr });
  return format(new Date(dateStr), "dd/MM");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-4 py-4 px-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
        {getDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

function ReactionPills({
  messageId,
  reactions,
  currentUserId,
  onToggle,
}: {
  messageId: string;
  reactions: Record<
    string,
    { count: number; userIds: string[]; userNames: string[] }
  >;
  currentUserId: string;
  onToggle: (messageId: string, emoji: string) => void;
}) {
  const emojis = Object.keys(reactions);
  if (emojis.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {emojis.map((emoji) => {
        const data = reactions[emoji];
        const hasReacted = data.userIds.includes(currentUserId);
        return (
          <TooltipProvider key={emoji} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onToggle(messageId, emoji)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 border",
                    hasReacted
                      ? "bg-[#7af17a]/10 border-[#7af17a]/25 text-[#7af17a] shadow-[0_0_8px_rgba(122,241,122,0.1)]"
                      : "bg-secondary/50 border-transparent text-muted-foreground hover:bg-secondary hover:border-border",
                  )}
                >
                  <span className="text-sm">{emoji}</span>
                  <span>{data.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-medium">
                {data.userNames.filter(Boolean).join(", ") || "Utilisateur"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}

function QuickEmojiPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-full right-0 mb-2 z-50 bg-popover/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/10 p-2.5 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
      onMouseLeave={onClose}
    >
      <div className="grid grid-cols-6 gap-1">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-secondary hover:scale-110 text-lg transition-all duration-150"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// Voice message player
function VoicePlayer({ url, duration }: { url: string; duration?: number }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animRef = useRef<number | null>(null);

  /* eslint-disable react-hooks/immutability */
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration && isFinite(audio.duration)) {
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(Math.floor(audio.currentTime));
    }
    if (playing) animRef.current = requestAnimationFrame(updateProgress);
  }, [playing]);
  /* eslint-enable react-hooks/immutability */

  useEffect(() => {
    if (playing) {
      animRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [playing, updateProgress]);

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onloadedmetadata = () => {
        if (isFinite(audio.duration))
          setTotalDuration(Math.floor(audio.duration));
      };
      audio.onended = () => {
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct * 100);
    setCurrentTime(Math.floor(audio.currentTime));
  };

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2.5 bg-muted/30 rounded-2xl px-3 py-2 min-w-[180px] max-w-[260px]">
      <button
        onClick={toggle}
        className="h-8 w-8 shrink-0 rounded-full bg-[#7af17a]/10 flex items-center justify-center hover:bg-[#7af17a]/20 transition-colors"
      >
        {playing ? (
          <Pause className="h-3.5 w-3.5 text-[#7af17a]" />
        ) : (
          <Play className="h-3.5 w-3.5 text-[#7af17a] ml-0.5" />
        )}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div
          className="h-1.5 bg-border/60 rounded-full cursor-pointer overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-[#7af17a] rounded-full transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground/60 font-medium tabular-nums">
          {playing || currentTime > 0
            ? formatSec(currentTime)
            : formatSec(totalDuration)}
        </span>
      </div>
    </div>
  );
}

// Sidebar conversation row for social channels
function SocialConvRow({
  name,
  lastMessage,
  lastMessageTime,
  unread,
  isActive,
  avatarId,
  badge,
  onClick,
}: {
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unread: number;
  isActive: boolean;
  avatarId: string;
  badge: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
        isActive
          ? "bg-[#7af17a]/8 ring-1 ring-[#7af17a]/20"
          : "hover:bg-secondary/60",
      )}
      onClick={onClick}
    >
      <div className="relative shrink-0">
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm",
            getAvatarColor(avatarId),
          )}
        >
          {getInitials(name)}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5">{badge}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-[13px] truncate",
              isActive
                ? "font-semibold text-foreground"
                : unread > 0
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground/80",
            )}
          >
            {name}
          </p>
          {lastMessageTime && (
            <span
              className={cn(
                "text-[10px] shrink-0",
                unread > 0
                  ? "text-[#7af17a] font-semibold"
                  : "text-muted-foreground/60",
              )}
            >
              {formatTimeAgo(lastMessageTime)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className={cn(
              "text-[11px] truncate mt-0.5",
              unread > 0 ? "text-foreground/70" : "text-muted-foreground/60",
            )}
          >
            {lastMessage}
          </p>
        )}
      </div>
      {unread > 0 && (
        <span className="bg-[#7af17a] text-[#14080e] text-[10px] font-bold h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full shadow-sm shadow-[#7af17a]/30">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}

// Section header
function SectionHeader({
  label,
  count,
  isOpen,
  onToggle,
  action,
  dotColor,
}: {
  label: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
  dotColor?: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-[0.08em] hover:text-foreground/80 transition-colors"
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            !isOpen && "-rotate-90",
          )}
        />
        {dotColor && (
          <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        )}
        {label}
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-muted-foreground/50 font-medium normal-case tracking-normal">
            {count}
          </span>
        )}
      </button>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ChatLayout({
  initialChannels,
  currentUserId,
  initialUnreadCounts,
  userRole,
  teamMembers,
  initialWAConversations,
  initialLinkedinConversations,
  initialInstagramConversations,
  unipileWhatsApp,
  unipileLinkedin,
  unipileInstagram,
}: ChatLayoutProps) {
  const supabase = useMemo(() => createClient(), []);
  const isAdmin = ADMIN_ROLES.includes(userRole);

  // ---- Core state ----
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [unreadCounts, setUnreadCounts] =
    useState<Record<string, number>>(initialUnreadCounts);

  // ---- WhatsApp state ----
  const [waConversations, setWAConversations] = useState<WAConversation[]>(
    initialWAConversations,
  );
  const [activeWA, setActiveWA] = useState<WAConversation | null>(null);
  const [waMessage, setWAMessage] = useState("");
  const [sendingWA, setSendingWA] = useState(false);
  const [waConnected, setWaConnected] = useState(
    unipileWhatsApp?.connected || false,
  );
  const [connectingWA, setConnectingWA] = useState(false);

  // ---- Audience filter (B2C / B2B / Tous) for admin ----
  const [audienceFilter, setAudienceFilter] = useState<"all" | "b2c" | "b2b">(
    "all",
  );

  // ---- Collapsible sections ----
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [dmsOpen, setDmsOpen] = useState(true);
  const [waOpen, setWaOpen] = useState(true);
  const [linkedinOpen, setLinkedinOpen] = useState(true);
  const [instagramOpen, setInstagramOpen] = useState(true);

  // ---- LinkedIn / Instagram state ----
  const [linkedinConversations] = useState<SocialConversation[]>(
    initialLinkedinConversations,
  );
  const [instagramConversations] = useState<SocialConversation[]>(
    initialInstagramConversations,
  );
  const [activeSocial, setActiveSocial] = useState<SocialConversation | null>(
    null,
  );
  const [socialMessage, setSocialMessage] = useState("");
  const [sendingSocial, setSendingSocial] = useState(false);
  const [linkedinConnected, setLinkedinConnected] = useState(
    unipileLinkedin?.connected || false,
  );
  const [connectingLinkedin, setConnectingLinkedin] = useState(false);
  const [instagramConnected, setInstagramConnected] = useState(
    unipileInstagram?.connected || false,
  );
  const [connectingInstagram, setConnectingInstagram] = useState(false);

  // ---- Image upload ----
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // ---- Voice recording ----
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Reactions ----
  const [rawReactions, setRawReactions] = useState<RawReaction[]>([]);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  // ---- Editing ----
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // ---- Reply ----
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // ---- Message search ----
  const [msgSearchOpen, setMsgSearchOpen] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState<
    {
      id: string;
      content: string;
      channel_id: string;
      channel_name: string;
      sender_name: string;
      sender_id: string;
      created_at: string;
    }[]
  >([]);
  const [msgSearching, setMsgSearching] = useState(false);
  const msgSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // ---- Admin state ----
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showNewDMDialog, setShowNewDMDialog] = useState(false);
  const [channelToManage, setChannelToManage] = useState<Channel | null>(null);
  const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  // ---- Create channel form ----
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelType, setNewChannelType] = useState<
    "group" | "direct" | "announcement"
  >("group");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // ---- DM search ----
  const [dmSearch, setDmSearch] = useState("");

  // ---- Refs ----
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Presence ----
  const { onlineUsers, typingUsers, setTyping } = usePresence(
    activeChannel?.id ? `chat:${activeChannel.id}` : null,
    currentUserId,
    "Utilisateur",
  );

  // ---- Derived data ----
  const groupChannels = useMemo(
    () => channels.filter((c) => c.type !== "direct"),
    [channels],
  );
  const dmChannels = useMemo(
    () => channels.filter((c) => c.type === "direct"),
    [channels],
  );

  const groupedReactions = useMemo(() => {
    const map: Record<
      string,
      Record<string, { count: number; userIds: string[]; userNames: string[] }>
    > = {};
    for (const r of rawReactions) {
      if (!map[r.message_id]) map[r.message_id] = {};
      if (!map[r.message_id][r.emoji])
        map[r.message_id][r.emoji] = { count: 0, userIds: [], userNames: [] };
      map[r.message_id][r.emoji].count++;
      map[r.message_id][r.emoji].userIds.push(r.user_id);
      map[r.message_id][r.emoji].userNames.push(r.user_name);
    }
    return map;
  }, [rawReactions]);

  function getDMPartner(channel: Channel): TeamMember | undefined {
    if (channel.type !== "direct" || !channel.members) return undefined;
    const otherId = channel.members.find((id: string) => id !== currentUserId);
    return teamMembers.find((m) => m.id === otherId);
  }

  // ---- Callbacks ----

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  async function loadAllUsers() {
    if (allUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const users = await getAllUsers();
      setAllUsers(users as TeamMember[]);
    } catch {
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoadingUsers(false);
    }
  }

  const loadReactions = useCallback(
    async (messageIds: string[]) => {
      if (messageIds.length === 0) {
        setRawReactions([]);
        return;
      }
      const { data } = await supabase
        .from("message_reactions")
        .select("id, message_id, user_id, emoji, user:profiles(full_name)")
        .in("message_id", messageIds);
      if (data) {
        setRawReactions(
          data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            message_id: r.message_id as string,
            user_id: r.user_id as string,
            emoji: r.emoji as string,
            user_name:
              ((Array.isArray(r.user)
                ? (r.user[0] as Record<string, unknown>)?.full_name
                : (r.user as Record<string, unknown>)?.full_name) as string) ||
              "",
          })),
        );
      }
    },
    [supabase],
  );

  const loadOlderMessages = useCallback(async () => {
    if (!activeChannel || !messages.length || loadingMore) return;
    setLoadingMore(true);
    const oldestDate = messages[0]?.created_at;
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .eq("channel_id", activeChannel.id)
      .lt("created_at", oldestDate)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);
    if (data && data.length > 0) {
      const reversed = data.reverse();
      setMessages((prev) => [...reversed, ...prev]);
      setHasMore(data.length === PAGE_SIZE);
      loadReactions([
        ...reversed.map((m: Message) => m.id),
        ...messages.map((m) => m.id),
      ]);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [activeChannel, messages, loadingMore, supabase, loadReactions]);

  // ---- Effects ----

  useEffect(() => {
    if (!activeChannel) return;

    setReplyTo(null);

    async function loadMessages() {
      setLoading(true);
      setRawReactions([]);
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles(*)")
        .eq("channel_id", activeChannel!.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const sorted = (data || []).reverse();
      setMessages(sorted);
      setHasMore((data || []).length === PAGE_SIZE);
      setLoading(false);
      setTimeout(scrollToBottom, 100);
      if (sorted.length > 0) {
        loadReactions(sorted.map((m: Message) => m.id));
      }
    }

    loadMessages();
    (async () => {
      const { data: existing } = await supabase
        .from("channel_reads")
        .select("id")
        .eq("channel_id", activeChannel!.id)
        .eq("user_id", currentUserId)
        .maybeSingle();
      if (existing) {
        await supabase
          .from("channel_reads")
          .update({ last_read_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("channel_reads").insert({
          channel_id: activeChannel!.id,
          user_id: currentUserId,
          last_read_at: new Date().toISOString(),
        });
      }
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[activeChannel!.id];
        return next;
      });
    })();

    const msgSub = supabase
      .channel(`messages:${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newId = payload.new.id;
            const { data: fullMessage } = await supabase
              .from("messages")
              .select("*, sender:profiles(*)")
              .eq("id", newId)
              .single();
            if (fullMessage) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === fullMessage.id)) return prev;
                return [...prev, fullMessage];
              });
              setTimeout(scrollToBottom, 100);
              const chId = activeChannel!.id;
              supabase
                .from("channel_reads")
                .select("id")
                .eq("channel_id", chId)
                .eq("user_id", currentUserId)
                .maybeSingle()
                .then(({ data: ex }) => {
                  if (ex) {
                    supabase
                      .from("channel_reads")
                      .update({ last_read_at: new Date().toISOString() })
                      .eq("id", ex.id)
                      .then(() => {});
                  } else {
                    supabase
                      .from("channel_reads")
                      .insert({
                        channel_id: chId,
                        user_id: currentUserId,
                        last_read_at: new Date().toISOString(),
                      })
                      .then(() => {});
                  }
                });
            }
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            const { data: fullMessage } = await supabase
              .from("messages")
              .select("*, sender:profiles(*)")
              .eq("id", payload.new.id)
              .single();
            if (fullMessage) {
              setMessages((prev) =>
                prev.map((m) => (m.id === fullMessage.id ? fullMessage : m)),
              );
            }
          }
        },
      )
      .subscribe();

    const reactionSub = supabase
      .channel(`reactions:${activeChannel.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          setMessages((prev) => {
            if (prev.length > 0) {
              loadReactions(prev.map((m) => m.id));
            }
            return prev;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgSub);
      supabase.removeChannel(reactionSub);
    };
  }, [activeChannel, supabase, scrollToBottom, loadReactions, currentUserId]);

  // ---- Handlers ----

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L’image doit faire moins de 10 Mo");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `chat/${currentUserId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-media")
        .upload(path, file, { upsert: true });
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
    const content = newMessage.trim();
    const isImage = !!imageUrl;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      channel_id: activeChannel.id,
      sender_id: currentUserId,
      content: isImage ? content || "" : content,
      message_type: isImage ? "image" : "text",
      file_url: isImage ? imageUrl : null,
      created_at: new Date().toISOString(),
      sender: { id: currentUserId, full_name: "Moi", avatar_url: null },
      is_edited: false,
      reply_to: replyTo?.id || null,
      file_name: null,
    } as unknown as Message;
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setTyping(false);
    const currentReplyTo = replyTo;
    setReplyTo(null);
    if (isImage) {
      setImageUrl(null);
      setImagePreview(null);
    }
    setTimeout(scrollToBottom, 50);
    const insertData: Record<string, unknown> = {
      channel_id: activeChannel.id,
      sender_id: currentUserId,
      content: isImage ? content || "" : content,
      message_type: isImage ? "image" : "text",
    };
    if (isImage) insertData.file_url = imageUrl;
    if (currentReplyTo) insertData.reply_to = currentReplyTo.id;
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert(insertData)
      .select("*, sender:profiles(*)")
      .single();
    if (error) {
      toast.error("Erreur : " + (error.message || "vérifiez vos permissions"));
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }
    if (inserted) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? inserted : m)),
      );
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // ---- Voice recording handlers ----

  const startRecording = useCallback(async () => {
    if (!activeChannel) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      toast.error("Impossible d'accéder au microphone");
    }
  }, [activeChannel]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const duration = recordingDuration;
    setIsRecording(false);
    setUploadingVoice(true);

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        recorder.stream.getTracks().forEach((t) => t.stop());

        try {
          const ext = recorder.mimeType.includes("mp4") ? "mp4" : "webm";
          const fileName = `chat/${currentUserId}/voice-${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("chat-media")
            .upload(fileName, blob, {
              contentType: recorder.mimeType,
              upsert: true,
            });

          if (uploadError) throw new Error(uploadError.message);

          const { data: urlData } = supabase.storage
            .from("chat-media")
            .getPublicUrl(fileName);

          if (activeChannel) {
            const optimisticId = `optimistic-${Date.now()}`;
            const optimisticMessage = {
              id: optimisticId,
              channel_id: activeChannel.id,
              sender_id: currentUserId,
              content: "Message vocal",
              message_type: "voice" as const,
              file_url: urlData.publicUrl,
              file_name: `${duration}`,
              created_at: new Date().toISOString(),
              sender: { id: currentUserId, full_name: "Moi", avatar_url: null },
              is_edited: false,
              reply_to: null,
            } as unknown as Message;
            setMessages((prev) => [...prev, optimisticMessage]);
            setTimeout(scrollToBottom, 50);

            const { data: inserted, error: insertError } = await supabase
              .from("messages")
              .insert({
                channel_id: activeChannel.id,
                sender_id: currentUserId,
                content: "Message vocal",
                message_type: "voice",
                file_url: urlData.publicUrl,
                file_name: `${duration}`,
              })
              .select("*, sender:profiles(*)")
              .single();

            if (insertError) {
              toast.error("Erreur envoi vocal : " + insertError.message);
              setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
            } else if (inserted) {
              setMessages((prev) =>
                prev.map((m) => (m.id === optimisticId ? inserted : m)),
              );
            }
          }
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : "Erreur upload vocal",
          );
        } finally {
          setUploadingVoice(false);
          resolve();
        }
      };
      recorder.stop();
    });
  }, [
    activeChannel,
    currentUserId,
    recordingDuration,
    scrollToBottom,
    supabase,
  ]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  async function handleToggleReaction(messageId: string, emoji: string) {
    const userId = currentUserId;
    const existing = rawReactions.find(
      (r) =>
        r.message_id === messageId && r.user_id === userId && r.emoji === emoji,
    );
    setRawReactions((prev) => {
      if (existing) return prev.filter((r) => r.id !== existing.id);
      return [
        ...prev,
        {
          id: `optimistic-${Date.now()}`,
          message_id: messageId,
          user_id: userId,
          emoji,
          user_name: "Moi",
        },
      ];
    });
    setEmojiPickerFor(null);
    try {
      if (existing && !existing.id.startsWith("optimistic")) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        const { data: serverExisting } = await supabase
          .from("message_reactions")
          .select("id")
          .eq("message_id", messageId)
          .eq("user_id", userId)
          .eq("emoji", emoji)
          .maybeSingle();
        if (serverExisting) {
          await supabase
            .from("message_reactions")
            .delete()
            .eq("id", serverExisting.id);
        } else {
          await supabase
            .from("message_reactions")
            .insert({ message_id: messageId, user_id: userId, emoji });
        }
      }
    } catch {
      loadReactions(messages.map((m) => m.id));
    }
  }

  async function handleEditMessage(messageId: string) {
    if (!editContent.trim()) return;
    try {
      await editMessageAction(messageId, editContent.trim());
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, content: editContent.trim(), is_edited: true }
            : m,
        ),
      );
      setEditingMessageId(null);
      setEditContent("");
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await deleteMessageAction(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  function handleMsgSearchInput(value: string) {
    setMsgSearchQuery(value);
    if (msgSearchTimeoutRef.current) clearTimeout(msgSearchTimeoutRef.current);
    if (value.trim().length < 2) {
      setMsgSearchResults([]);
      return;
    }
    msgSearchTimeoutRef.current = setTimeout(async () => {
      setMsgSearching(true);
      try {
        const results = await searchMessages(value);
        setMsgSearchResults(results);
      } catch {
        toast.error("Erreur de recherche");
      } finally {
        setMsgSearching(false);
      }
    }, 400);
  }

  function handleSearchResultClick(result: { id: string; channel_id: string }) {
    // Navigate to the channel and scroll to the message
    const targetChannel = channels.find((c) => c.id === result.channel_id);
    if (targetChannel) {
      setActiveChannel(targetChannel);
      setActiveWA(null);
      setActiveSocial(null);
    }
    setMsgSearchOpen(false);
    setMsgSearchQuery("");
    setMsgSearchResults([]);
    // After loading, try to scroll to the message
    setTimeout(() => {
      const el = document.getElementById(`msg-${result.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("bg-[#7af17a]/10");
        setTimeout(() => el.classList.remove("bg-[#7af17a]/10"), 2000);
      }
    }, 600);
  }

  async function handleStartDM(otherUserId: string) {
    setShowNewDMDialog(false);
    try {
      const dmChannel = await getOrCreateDM(otherUserId);
      const { data: allChannels } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(allChannels || []);
      setActiveChannel(dmChannel);
      setActiveWA(null);
      setActiveSocial(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création du DM",
      );
    }
  }

  async function handleSendWAMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!waMessage.trim() || !activeWA) return;
    const content = waMessage.trim();
    setSendingWA(true);
    setWAMessage("");
    const optimisticMsg: WAMessage = {
      id: `opt-${Date.now()}`,
      direction: "outbound",
      content,
      status: "sent",
      created_at: new Date().toISOString(),
    };
    setActiveWA((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev,
    );
    setTimeout(scrollToBottom, 50);
    try {
      await sendWhatsAppMessage({ prospectId: activeWA.prospect_id, content });
    } catch {
      toast.error("Erreur envoi WhatsApp");
      setActiveWA((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== optimisticMsg.id),
            }
          : prev,
      );
    } finally {
      setSendingWA(false);
    }
  }

  async function handleSendSocialMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!socialMessage.trim() || !activeSocial) return;
    const content = socialMessage.trim();
    setSendingSocial(true);
    setSocialMessage("");
    const optimisticMsg: SocialMessage = {
      sender: "me",
      content,
      type: "text",
      timestamp: new Date().toISOString(),
    };
    setActiveSocial((prev) =>
      prev ? { ...prev, messages: [...prev.messages, optimisticMsg] } : prev,
    );
    setTimeout(scrollToBottom, 50);
    try {
      const chatId = activeSocial.id.replace("unipile-", "");
      const res = await fetch("/api/unipile/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, text: content }),
      });
      if (!res.ok) throw new Error("Send failed");
    } catch {
      toast.error("Erreur envoi message");
      setActiveSocial((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m !== optimisticMsg),
            }
          : prev,
      );
    } finally {
      setSendingSocial(false);
    }
  }

  async function handleCreateChannel() {
    if (!newChannelName.trim()) {
      toast.error("Le nom du channel est requis");
      return;
    }
    setSaving(true);
    try {
      await createChannel({
        name: newChannelName.trim(),
        description: newChannelDescription.trim() || undefined,
        type: newChannelType,
        memberIds: selectedMemberIds,
      });
      toast.success("Channel créé");
      setShowCreateDialog(false);
      resetCreateForm();
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteChannel() {
    if (!channelToManage) return;
    setSaving(true);
    try {
      await deleteChannel(channelToManage.id);
      toast.success("Channel supprimé");
      setShowDeleteConfirm(false);
      setChannelToManage(null);
      if (activeChannel?.id === channelToManage.id) setActiveChannel(null);
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateMembers() {
    if (!channelToManage) return;
    setSaving(true);
    try {
      await updateChannelMembers(channelToManage.id, selectedMemberIds);
      toast.success("Membres mis à jour");
      setShowMembersDialog(false);
      setChannelToManage(null);
      setSelectedMemberIds([]);
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function openMembersDialog(channel: Channel) {
    setChannelToManage(channel);
    await loadAllUsers();
    try {
      const members = await getChannelMembers(channel.id);
      setSelectedMemberIds(members.map((m: TeamMember) => m.id));
    } catch {
      setSelectedMemberIds(channel.members || []);
    }
    setShowMembersDialog(true);
  }

  function openCreateDialog() {
    resetCreateForm();
    loadAllUsers();
    setShowCreateDialog(true);
  }
  function resetCreateForm() {
    setNewChannelName("");
    setNewChannelDescription("");
    setNewChannelType("group");
    setSelectedMemberIds([]);
    setMemberSearch("");
  }
  function toggleMember(userId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  // ---- Filtered data ----
  const filteredGroupChannels = groupChannels.filter((c) => {
    if (
      channelSearch &&
      !c.name.toLowerCase().includes(channelSearch.toLowerCase())
    )
      return false;
    // Audience filter: filter by channel name convention (b2c/b2b in name) or show all
    if (audienceFilter !== "all") {
      const nameLower = c.name.toLowerCase();
      if (
        audienceFilter === "b2c" &&
        !nameLower.includes("b2c") &&
        !nameLower.includes("setter") &&
        !nameLower.includes("formation")
      )
        return false;
      if (
        audienceFilter === "b2b" &&
        !nameLower.includes("b2b") &&
        !nameLower.includes("entrepreneur") &&
        !nameLower.includes("business")
      )
        return false;
    }
    return true;
  });
  const filteredDMChannels = dmChannels.filter((c) => {
    const partner = getDMPartner(c);
    if (channelSearch) {
      if (
        !c.name.toLowerCase().includes(channelSearch.toLowerCase()) &&
        !(partner?.full_name || "")
          .toLowerCase()
          .includes(channelSearch.toLowerCase())
      )
        return false;
    }
    // Audience filter for DMs: filter by partner role
    if (audienceFilter !== "all" && partner) {
      const partnerRole = (partner as unknown as { role?: string }).role || "";
      if (
        audienceFilter === "b2c" &&
        partnerRole !== "client_b2c" &&
        partnerRole !== "setter"
      )
        return false;
      if (audienceFilter === "b2b" && partnerRole !== "client_b2b")
        return false;
    }
    return true;
  });
  const filteredUsers = allUsers.filter(
    (u) =>
      !memberSearch ||
      (u.full_name || "").toLowerCase().includes(memberSearch.toLowerCase()),
  );
  const filteredDMUsers = teamMembers.filter(
    (u) =>
      u.id !== currentUserId &&
      (!dmSearch ||
        (u.full_name || "").toLowerCase().includes(dmSearch.toLowerCase())),
  );
  const filteredWAConversations = waConversations.filter(
    (c) =>
      !channelSearch ||
      (c.prospect?.name || "")
        .toLowerCase()
        .includes(channelSearch.toLowerCase()),
  );
  const filteredLinkedinConversations = linkedinConversations.filter(
    (c) =>
      !channelSearch ||
      (c.prospect?.name || "")
        .toLowerCase()
        .includes(channelSearch.toLowerCase()),
  );
  const filteredInstagramConversations = instagramConversations.filter(
    (c) =>
      !channelSearch ||
      (c.prospect?.name || "")
        .toLowerCase()
        .includes(channelSearch.toLowerCase()),
  );

  const activePartner = activeChannel ? getDMPartner(activeChannel) : undefined;
  const activeName =
    activeChannel?.type === "direct"
      ? activePartner?.full_name || "Message direct"
      : activeChannel?.name || "";

  // Total unread
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="flex h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)] gap-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">
      {/* ================================================================= */}
      {/* SIDEBAR                                                           */}
      {/* ================================================================= */}
      <div
        className={cn(
          "w-full md:w-[320px] flex-shrink-0 flex flex-col border-r border-border/50 bg-background overflow-hidden",
          activeChannel || activeWA || activeSocial ? "hidden md:flex" : "flex",
        )}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#7af17a] to-[#4ade80] flex items-center justify-center shadow-sm shadow-[#7af17a]/20">
              <MessageSquare className="h-4 w-4 text-[#14080e]" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-foreground leading-tight">
                Messages
              </h1>
              {totalUnread > 0 && (
                <p className="text-[10px] text-[#7af17a] font-semibold">
                  {totalUnread} non lu{totalUnread > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMsgSearchOpen((v) => !v)}
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-200",
                msgSearchOpen
                  ? "bg-[#7af17a]/15 text-[#7af17a]"
                  : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
              title="Rechercher dans les messages"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setDmSearch("");
                setShowNewDMDialog(true);
              }}
              className="h-8 w-8 rounded-xl bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
              title="Nouveau message"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Message search panel */}
        {msgSearchOpen && (
          <div className="px-4 pb-3 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Rechercher dans les messages..."
                value={msgSearchQuery}
                onChange={(e) => handleMsgSearchInput(e.target.value)}
                className="pl-10 pr-8 h-9 text-[13px] bg-secondary/50 border-0 rounded-xl placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-[#7af17a]/30 focus-visible:bg-background transition-all"
                autoFocus
              />
              {msgSearchQuery && (
                <button
                  onClick={() => {
                    setMsgSearchQuery("");
                    setMsgSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {msgSearching && (
              <div className="flex items-center gap-2 py-3 px-1 text-xs text-muted-foreground/60">
                <Loader2 className="h-3 w-3 animate-spin" /> Recherche...
              </div>
            )}
            {!msgSearching && msgSearchResults.length > 0 && (
              <ScrollArea className="max-h-64 mt-2">
                <div className="space-y-0.5">
                  {msgSearchResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleSearchResultClick(r)}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[12px] font-semibold text-foreground truncate">
                          {r.sender_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40">
                          dans #{r.channel_name}
                        </span>
                        <span className="text-[10px] text-muted-foreground/40 ml-auto shrink-0">
                          {format(new Date(r.created_at), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground/70 truncate">
                        {r.content}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {!msgSearching &&
              msgSearchQuery.length >= 2 &&
              msgSearchResults.length === 0 && (
                <p className="text-[11px] text-muted-foreground/40 text-center py-3">
                  Aucun résultat
                </p>
              )}
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Rechercher une conversation..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="pl-10 h-9 text-[13px] bg-secondary/50 border-0 rounded-xl placeholder:text-muted-foreground/40 focus-visible:ring-1 focus-visible:ring-[#7af17a]/30 focus-visible:bg-background transition-all"
            />
            {channelSearch && (
              <button
                onClick={() => setChannelSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Audience filter tabs (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-1 px-3 pb-2">
            {(["all", "b2c", "b2b"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setAudienceFilter(f)}
                className={cn(
                  "flex-1 text-[11px] font-medium py-1.5 rounded-lg transition-all",
                  audienceFilter === f
                    ? "bg-[#7af17a]/15 text-[#7af17a] border border-[#7af17a]/30"
                    : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary/50",
                )}
              >
                {f === "all" ? "Tous" : f === "b2c" ? "B2C" : "B2B"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 px-2">
          {/* ====== CHANNELS ====== */}
          <div className="mb-1">
            <SectionHeader
              label="Channels"
              isOpen={channelsOpen}
              onToggle={() => setChannelsOpen((v) => !v)}
              dotColor="bg-[#7af17a]"
              action={
                isAdmin ? (
                  <button
                    onClick={openCreateDialog}
                    className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-all"
                    title="Créer un channel"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                ) : undefined
              }
            />
            {channelsOpen && (
              <div className="space-y-0.5 px-1">
                {filteredGroupChannels.map((channel) => {
                  const isAnnouncement = channel.type === "announcement";
                  const Icon = isAnnouncement ? Megaphone : Hash;
                  const unread = unreadCounts[channel.id] || 0;
                  const isActive = activeChannel?.id === channel.id;
                  return (
                    <div key={channel.id} className="group flex items-center">
                      <button
                        className={cn(
                          "flex-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-200",
                          isActive
                            ? "bg-[#7af17a]/8 text-foreground font-semibold ring-1 ring-[#7af17a]/20"
                            : unread > 0
                              ? "text-foreground font-semibold hover:bg-secondary/60"
                              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                        onClick={() => {
                          setActiveChannel(channel);
                          setActiveWA(null);
                          setActiveSocial(null);
                        }}
                      >
                        <div
                          className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isActive
                              ? "bg-[#7af17a]/15 text-[#7af17a]"
                              : "bg-secondary/80 text-muted-foreground",
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate flex-1 text-left">
                          {channel.name}
                        </span>
                        {unread > 0 && (
                          <span className="bg-[#7af17a] text-[#14080e] text-[10px] font-bold h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full shadow-sm shadow-[#7af17a]/30">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        )}
                      </button>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-all">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-xl"
                          >
                            <DropdownMenuItem
                              onClick={() => openMembersDialog(channel)}
                              className="rounded-lg"
                            >
                              <Users className="h-3.5 w-3.5 mr-2" /> Gérer les
                              membres
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive rounded-lg"
                              onClick={() => {
                                setChannelToManage(channel);
                                setShowDeleteConfirm(true);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
                {filteredGroupChannels.length === 0 && !channelSearch && (
                  <p className="text-[11px] text-muted-foreground/40 px-3 py-3">
                    {isAdmin ? "Créez votre premier channel" : "Aucun channel"}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ====== DIRECT MESSAGES ====== */}
          <div className="mb-1">
            <SectionHeader
              label="Messages directs"
              count={dmChannels.length}
              isOpen={dmsOpen}
              onToggle={() => setDmsOpen((v) => !v)}
              dotColor="bg-blue-500"
              action={
                <button
                  onClick={() => {
                    setDmSearch("");
                    setShowNewDMDialog(true);
                  }}
                  className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground/50 hover:text-foreground transition-all"
                  title="Nouveau message"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              }
            />
            {dmsOpen && (
              <div className="space-y-0.5 px-1">
                {filteredDMChannels.map((channel) => {
                  const partner = getDMPartner(channel);
                  const unread = unreadCounts[channel.id] || 0;
                  const isActive = activeChannel?.id === channel.id;
                  const isOnline = partner
                    ? onlineUsers.some((u) => u.userId === partner.id)
                    : false;
                  return (
                    <button
                      key={channel.id}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200",
                        isActive
                          ? "bg-[#7af17a]/8 ring-1 ring-[#7af17a]/20"
                          : "hover:bg-secondary/60",
                      )}
                      onClick={() => {
                        setActiveChannel(channel);
                        setActiveWA(null);
                        setActiveSocial(null);
                      }}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shadow-sm",
                            partner ? getAvatarColor(partner.id) : "bg-muted",
                          )}
                        >
                          {getInitials(partner?.full_name)}
                        </div>
                        {isOnline && (
                          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#7af17a] border-[2.5px] border-background shadow-sm shadow-[#7af17a]/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-[13px] truncate",
                            isActive || unread > 0
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80",
                          )}
                        >
                          {partner?.full_name || "Utilisateur"}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 capitalize">
                          {partner?.role}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="bg-[#7af17a] text-[#14080e] text-[10px] font-bold h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full shadow-sm shadow-[#7af17a]/30">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filteredDMChannels.length === 0 && !channelSearch && (
                  <p className="text-[11px] text-muted-foreground/40 px-3 py-3">
                    Cliquez + pour envoyer un message
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ====== WHATSAPP ====== */}
          <div className="mb-1">
            <SectionHeader
              label="WhatsApp"
              count={waConversations.length}
              isOpen={waOpen}
              onToggle={() => setWaOpen((v) => !v)}
              dotColor="bg-green-500"
            />
            {waOpen && (
              <div className="space-y-0.5 px-1">
                {filteredWAConversations.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <SocialConvRow
                      key={conv.prospect_id}
                      name={conv.prospect?.name || "Inconnu"}
                      lastMessage={
                        lastMsg
                          ? `${lastMsg.direction === "outbound" ? "Vous : " : ""}${lastMsg.content?.slice(0, 50)}`
                          : undefined
                      }
                      lastMessageTime={conv.last_message_at}
                      unread={conv.unread_count}
                      isActive={activeWA?.prospect_id === conv.prospect_id}
                      avatarId={conv.prospect_id}
                      badge={
                        <div className="h-4 w-4 rounded-full bg-[#25D366] flex items-center justify-center ring-2 ring-background">
                          <Phone className="h-2 w-2 text-white" />
                        </div>
                      }
                      onClick={() => {
                        setActiveWA(conv);
                        setActiveChannel(null);
                        setActiveSocial(null);
                        setTimeout(scrollToBottom, 100);
                      }}
                    />
                  );
                })}
                {filteredWAConversations.length === 0 && (
                  <div className="px-3 py-5 text-center space-y-3">
                    <p className="text-[11px] text-muted-foreground/40">
                      {channelSearch ? "Aucun résultat" : "Aucune conversation"}
                    </p>
                    {!channelSearch && !waConnected && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full bg-[#25D366] text-white hover:bg-[#25D366]/90 text-xs rounded-xl h-9 font-medium"
                          disabled={connectingWA}
                          onClick={async () => {
                            setConnectingWA(true);
                            try {
                              const result =
                                await generateUnipileAuthLink("WHATSAPP");
                              if (result.error) toast.error(result.error);
                              else if (result.url) {
                                window.open(
                                  result.url,
                                  "_blank",
                                  "width=600,height=700,scrollbars=yes",
                                );
                                toast.info("Scannez le QR code WhatsApp");
                              }
                            } catch {
                              toast.error("Erreur de connexion");
                            }
                            setConnectingWA(false);
                          }}
                        >
                          {connectingWA ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Connecter WhatsApp
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[11px] text-muted-foreground/60 rounded-xl"
                          onClick={async () => {
                            try {
                              const status = await getUnipileStatus();
                              const wa = status.accounts.find(
                                (a) => a.provider.toUpperCase() === "WHATSAPP",
                              );
                              if (wa) {
                                setWaConnected(true);
                                toast.success(
                                  "WhatsApp connecté ! Rechargez la page.",
                                );
                              } else {
                                toast.info("Aucun compte détecté");
                              }
                            } catch {
                              toast.error("Erreur de vérification");
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Vérifier
                        </Button>
                      </div>
                    )}
                    {!channelSearch &&
                      waConnected &&
                      waConversations.length === 0 && (
                        <div className="flex items-center gap-2 justify-center text-[#25D366]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium">
                            Connecté
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ====== LINKEDIN ====== */}
          <div className="mb-1">
            <SectionHeader
              label="LinkedIn"
              count={linkedinConversations.length}
              isOpen={linkedinOpen}
              onToggle={() => setLinkedinOpen((v) => !v)}
              dotColor="bg-[#0A66C2]"
            />
            {linkedinOpen && (
              <div className="space-y-0.5 px-1">
                {filteredLinkedinConversations.map((conv) => {
                  const msgs = conv.messages || [];
                  const lastMsg = msgs[msgs.length - 1];
                  return (
                    <SocialConvRow
                      key={conv.id}
                      name={conv.prospect?.name || "Inconnu"}
                      lastMessage={
                        lastMsg
                          ? `${lastMsg.sender === "me" ? "Vous : " : ""}${lastMsg.content?.slice(0, 50)}`
                          : undefined
                      }
                      lastMessageTime={conv.last_message_at}
                      unread={conv.unread_count}
                      isActive={activeSocial?.id === conv.id}
                      avatarId={conv.prospect_id || conv.id}
                      badge={
                        <div className="h-4 w-4 rounded-full bg-[#0A66C2] flex items-center justify-center ring-2 ring-background">
                          <Linkedin className="h-2 w-2 text-white" />
                        </div>
                      }
                      onClick={() => {
                        setActiveSocial(conv);
                        setActiveChannel(null);
                        setActiveWA(null);
                        setTimeout(scrollToBottom, 100);
                      }}
                    />
                  );
                })}
                {filteredLinkedinConversations.length === 0 && (
                  <div className="px-3 py-5 text-center space-y-3">
                    <p className="text-[11px] text-muted-foreground/40">
                      {channelSearch ? "Aucun résultat" : "Aucune conversation"}
                    </p>
                    {!channelSearch && !linkedinConnected && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90 text-xs rounded-xl h-9 font-medium"
                          disabled={connectingLinkedin}
                          onClick={async () => {
                            setConnectingLinkedin(true);
                            try {
                              const result =
                                await generateUnipileAuthLink("LINKEDIN");
                              if (result.error) toast.error(result.error);
                              else if (result.url) {
                                window.open(
                                  result.url,
                                  "_blank",
                                  "width=600,height=700,scrollbars=yes",
                                );
                                toast.info("Connectez-vous à LinkedIn");
                              }
                            } catch {
                              toast.error("Erreur de connexion");
                            }
                            setConnectingLinkedin(false);
                          }}
                        >
                          {connectingLinkedin ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Linkedin className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Connecter LinkedIn
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[11px] text-muted-foreground/60 rounded-xl"
                          onClick={async () => {
                            try {
                              const status = await getUnipileStatus();
                              const li = status.accounts.find(
                                (a) => a.provider.toUpperCase() === "LINKEDIN",
                              );
                              if (li) {
                                setLinkedinConnected(true);
                                toast.success(
                                  "LinkedIn connecté ! Rechargez la page.",
                                );
                              } else {
                                toast.info("Aucun compte détecté");
                              }
                            } catch {
                              toast.error("Erreur de vérification");
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Vérifier
                        </Button>
                      </div>
                    )}
                    {!channelSearch &&
                      linkedinConnected &&
                      linkedinConversations.length === 0 && (
                        <div className="flex items-center gap-2 justify-center text-[#0A66C2]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium">
                            Connecté
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ====== INSTAGRAM ====== */}
          <div className="mb-4">
            <SectionHeader
              label="Instagram"
              count={instagramConversations.length}
              isOpen={instagramOpen}
              onToggle={() => setInstagramOpen((v) => !v)}
              dotColor="bg-gradient-to-r from-[#F58529] to-[#DD2A7B]"
            />
            {instagramOpen && (
              <div className="space-y-0.5 px-1">
                {filteredInstagramConversations.map((conv) => {
                  const msgs = conv.messages || [];
                  const lastMsg = msgs[msgs.length - 1];
                  return (
                    <SocialConvRow
                      key={conv.id}
                      name={conv.prospect?.name || "Inconnu"}
                      lastMessage={
                        lastMsg
                          ? `${lastMsg.sender === "me" ? "Vous : " : ""}${lastMsg.content?.slice(0, 50)}`
                          : undefined
                      }
                      lastMessageTime={conv.last_message_at}
                      unread={conv.unread_count}
                      isActive={activeSocial?.id === conv.id}
                      avatarId={conv.prospect_id || conv.id}
                      badge={
                        <div className="h-4 w-4 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center ring-2 ring-background">
                          <Instagram className="h-2 w-2 text-white" />
                        </div>
                      }
                      onClick={() => {
                        setActiveSocial(conv);
                        setActiveChannel(null);
                        setActiveWA(null);
                        setTimeout(scrollToBottom, 100);
                      }}
                    />
                  );
                })}
                {filteredInstagramConversations.length === 0 && (
                  <div className="px-3 py-5 text-center space-y-3">
                    <p className="text-[11px] text-muted-foreground/40">
                      {channelSearch ? "Aucun résultat" : "Aucune conversation"}
                    </p>
                    {!channelSearch && !instagramConnected && (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white hover:opacity-90 text-xs rounded-xl h-9 font-medium"
                          disabled={connectingInstagram}
                          onClick={async () => {
                            setConnectingInstagram(true);
                            try {
                              const result =
                                await generateUnipileAuthLink("INSTAGRAM");
                              if (result.error) toast.error(result.error);
                              else if (result.url) {
                                window.open(
                                  result.url,
                                  "_blank",
                                  "width=600,height=700,scrollbars=yes",
                                );
                                toast.info("Connectez-vous à Instagram");
                              }
                            } catch {
                              toast.error("Erreur de connexion");
                            }
                            setConnectingInstagram(false);
                          }}
                        >
                          {connectingInstagram ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Instagram className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Connecter Instagram
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-[11px] text-muted-foreground/60 rounded-xl"
                          onClick={async () => {
                            try {
                              const status = await getUnipileStatus();
                              const ig = status.accounts.find(
                                (a) => a.provider.toUpperCase() === "INSTAGRAM",
                              );
                              if (ig) {
                                setInstagramConnected(true);
                                toast.success(
                                  "Instagram connecté ! Rechargez la page.",
                                );
                              } else {
                                toast.info("Aucun compte détecté");
                              }
                            } catch {
                              toast.error("Erreur de vérification");
                            }
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Vérifier
                        </Button>
                      </div>
                    )}
                    {!channelSearch &&
                      instagramConnected &&
                      instagramConversations.length === 0 && (
                        <div className="flex items-center gap-2 justify-center text-[#DD2A7B]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[11px] font-medium">
                            Connecté
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MESSAGE AREA                                                      */}
      {/* ================================================================= */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-card",
          !activeChannel && !activeWA && !activeSocial && "hidden md:flex",
        )}
      >
        {activeWA ? (
          <>
            {/* WhatsApp header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 bg-card">
              <button
                onClick={() => setActiveWA(null)}
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm",
                      getAvatarColor(activeWA.prospect_id),
                    )}
                  >
                    {getInitials(activeWA.prospect?.name)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-[#25D366] flex items-center justify-center ring-2 ring-card">
                    <Phone className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold text-[15px] leading-tight">
                    {activeWA.prospect?.name || "Inconnu"}
                  </h2>
                  <p className="text-[11px] text-[#25D366] font-medium">
                    WhatsApp
                  </p>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-5 py-4 space-y-1.5">
                {activeWA.messages.map((msg, i) => {
                  const isOutbound = msg.direction === "outbound";
                  return (
                    <div
                      key={msg.id || i}
                      className={cn(
                        "flex",
                        isOutbound ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm",
                          isOutbound
                            ? "bg-gradient-to-br from-[#7af17a]/15 to-[#7af17a]/8 text-foreground rounded-br-md"
                            : "bg-secondary/60 rounded-bl-md",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1.5 font-medium",
                            isOutbound
                              ? "text-[#7af17a]/50 text-right"
                              : "text-muted-foreground/40",
                          )}
                        >
                          {format(new Date(msg.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {activeWA.messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                      <Phone className="h-7 w-7 opacity-30" />
                    </div>
                    <p className="font-semibold text-sm">Aucun message</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      Envoyez le premier message
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="px-5 py-4 border-t border-border/50">
              <form onSubmit={handleSendWAMessage} className="relative">
                <Textarea
                  value={waMessage}
                  onChange={(e) => setWAMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendWAMessage(e);
                    }
                  }}
                  placeholder={`Message à ${activeWA.prospect?.name || "prospect"}...`}
                  className="min-h-[44px] max-h-[120px] resize-none text-[13px] py-3 pr-12 rounded-2xl bg-secondary/40 border-border/50 focus-visible:ring-[#7af17a]/30 placeholder:text-muted-foreground/40"
                  rows={1}
                />
                <Button
                  type="submit"
                  size="icon"
                  className={cn(
                    "absolute right-2 bottom-2 h-8 w-8 rounded-xl transition-all duration-200",
                    waMessage.trim()
                      ? "bg-[#25D366] text-white hover:bg-[#25D366]/90 shadow-sm shadow-[#25D366]/30"
                      : "bg-secondary text-muted-foreground/40",
                  )}
                  disabled={!waMessage.trim() || sendingWA}
                >
                  {sendingWA ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : activeSocial ? (
          <>
            {/* Social header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 bg-card">
              <button
                onClick={() => setActiveSocial(null)}
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm",
                      getAvatarColor(
                        activeSocial.prospect_id || activeSocial.id,
                      ),
                    )}
                  >
                    {getInitials(activeSocial.prospect?.name)}
                  </div>
                  <div
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-card",
                      activeSocial.platform === "linkedin"
                        ? "bg-[#0A66C2]"
                        : "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
                    )}
                  >
                    {activeSocial.platform === "linkedin" ? (
                      <Linkedin className="h-2 w-2 text-white" />
                    ) : (
                      <Instagram className="h-2 w-2 text-white" />
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="font-semibold text-[15px] leading-tight">
                    {activeSocial.prospect?.name || "Inconnu"}
                  </h2>
                  <p
                    className={cn(
                      "text-[11px] font-medium capitalize",
                      activeSocial.platform === "linkedin"
                        ? "text-[#0A66C2]"
                        : "text-[#DD2A7B]",
                    )}
                  >
                    {activeSocial.platform}
                  </p>
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-5 py-4 space-y-1.5">
                {(activeSocial.messages || []).map((msg, i) => {
                  const isMe = msg.sender === "me";
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        isMe ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm",
                          isMe
                            ? "bg-gradient-to-br from-[#7af17a]/15 to-[#7af17a]/8 text-foreground rounded-br-md"
                            : "bg-secondary/60 rounded-bl-md",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                        <p
                          className={cn(
                            "text-[10px] mt-1.5 font-medium",
                            isMe
                              ? "text-muted-foreground/40 text-right"
                              : "text-muted-foreground/40",
                          )}
                        >
                          {msg.timestamp
                            ? format(new Date(msg.timestamp), "HH:mm")
                            : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {(!activeSocial.messages ||
                  activeSocial.messages.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <div className="h-16 w-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                      <Inbox className="h-7 w-7 opacity-30" />
                    </div>
                    <p className="font-semibold text-sm">Aucun message</p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      Envoyez le premier message
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="px-5 py-4 border-t border-border/50">
              <form onSubmit={handleSendSocialMessage} className="relative">
                <Textarea
                  value={socialMessage}
                  onChange={(e) => setSocialMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendSocialMessage(e);
                    }
                  }}
                  placeholder={`Message à ${activeSocial.prospect?.name || "prospect"}...`}
                  className="min-h-[44px] max-h-[120px] resize-none text-[13px] py-3 pr-12 rounded-2xl bg-secondary/40 border-border/50 focus-visible:ring-[#7af17a]/30 placeholder:text-muted-foreground/40"
                  rows={1}
                />
                <Button
                  type="submit"
                  size="icon"
                  className={cn(
                    "absolute right-2 bottom-2 h-8 w-8 rounded-xl transition-all duration-200",
                    socialMessage.trim()
                      ? "bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 shadow-sm shadow-[#7af17a]/30"
                      : "bg-secondary text-muted-foreground/40",
                  )}
                  disabled={!socialMessage.trim() || sendingSocial}
                >
                  {sendingSocial ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : activeChannel ? (
          <>
            {/* Channel/DM header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 bg-card">
              <button
                onClick={() => setActiveChannel(null)}
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {activeChannel.type === "direct" && activePartner ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm",
                        getAvatarColor(activePartner.id),
                      )}
                    >
                      {getInitials(activePartner.full_name)}
                    </div>
                    <OnlineStatus
                      isOnline={onlineUsers.some(
                        (u) => u.userId === activePartner.id,
                      )}
                    />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[15px] leading-tight">
                      {activePartner.full_name || "Utilisateur"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground/60 capitalize">
                      {activePartner.role}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      activeChannel.type === "announcement"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-[#7af17a]/10 text-[#7af17a]",
                    )}
                  >
                    {activeChannel.type === "announcement" ? (
                      <Megaphone className="h-4.5 w-4.5" />
                    ) : (
                      <Hash className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-[15px] leading-tight">
                      {activeChannel.name}
                    </h2>
                    {activeChannel.description && (
                      <p className="text-[11px] text-muted-foreground/60 truncate max-w-md">
                        {activeChannel.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
                {onlineUsers.length > 0 && activeChannel.type !== "direct" && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mr-2 bg-secondary/50 px-2.5 py-1 rounded-full">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#7af17a] animate-pulse" />
                    {onlineUsers.length} en ligne
                  </div>
                )}
                {isAdmin && activeChannel.type !== "direct" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl"
                      onClick={() => openMembersDialog(activeChannel)}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-destructive/60 hover:text-destructive"
                      onClick={() => {
                        setChannelToManage(activeChannel);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="px-5 py-3">
                {loading ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground/60">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />{" "}
                    Chargement...
                  </div>
                ) : (
                  <>
                    {messages.length === 0 && !hasMore && (
                      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-[#7af17a]/10 to-[#7af17a]/5 flex items-center justify-center mb-5 shadow-inner">
                          <Sparkles className="h-9 w-9 text-[#7af17a]/40" />
                        </div>
                        <p className="font-semibold text-base text-foreground/80">
                          {activeChannel.type === "direct"
                            ? `Dites bonjour à ${activePartner?.full_name || "cet utilisateur"}`
                            : `Bienvenue dans #${activeChannel.name}`}
                        </p>
                        <p className="text-[13px] mt-1.5 text-muted-foreground/50">
                          Envoyez le premier message pour démarrer la
                          conversation
                        </p>
                      </div>
                    )}
                    {hasMore && (
                      <div className="text-center py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadOlderMessages}
                          disabled={loadingMore}
                          className="text-xs text-muted-foreground/60 rounded-xl hover:text-foreground"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />{" "}
                              Chargement...
                            </>
                          ) : (
                            "Charger les messages précédents"
                          )}
                        </Button>
                      </div>
                    )}
                    {messages.map((message, index) => {
                      const prevMessage =
                        index > 0 ? messages[index - 1] : null;
                      const isGrouped = prevMessage
                        ? shouldGroup(prevMessage, message)
                        : false;
                      const isOwn = message.sender_id === currentUserId;
                      const senderName = isOwn
                        ? "Moi"
                        : message.sender?.full_name ||
                          message.sender?.email ||
                          "Utilisateur";
                      const senderId = message.sender_id || "";
                      const isEditing = editingMessageId === message.id;
                      const messageReactions =
                        groupedReactions[message.id] || {};
                      const showDate =
                        !prevMessage ||
                        !isSameDay(
                          new Date(prevMessage.created_at),
                          new Date(message.created_at),
                        );

                      return (
                        <div
                          key={message.id}
                          id={`msg-${message.id}`}
                          className="transition-colors duration-500"
                        >
                          {showDate && (
                            <DateSeparator
                              date={new Date(message.created_at)}
                            />
                          )}
                          {activeChannel?.type === "direct" ? (
                            <div
                              className={cn(
                                "group relative flex flex-col",
                                isOwn ? "items-end" : "items-start",
                                isGrouped ? "pt-0.5" : "pt-3",
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm",
                                  isOwn
                                    ? "bg-gradient-to-br from-[#7af17a]/15 to-[#7af17a]/8 text-foreground rounded-br-md"
                                    : "bg-secondary/60 rounded-bl-md",
                                )}
                              >
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editContent}
                                      onChange={(e) =>
                                        setEditContent(e.target.value)
                                      }
                                      className="min-h-[60px] text-[13px] rounded-xl"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          handleEditMessage(message.id);
                                        }
                                        if (e.key === "Escape") {
                                          setEditingMessageId(null);
                                          setEditContent("");
                                        }
                                      }}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() =>
                                          handleEditMessage(message.id)
                                        }
                                      >
                                        Enregistrer
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() => {
                                          setEditingMessageId(null);
                                          setEditContent("");
                                        }}
                                      >
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {message.reply_to &&
                                      (() => {
                                        const quoted = messages.find(
                                          (m) => m.id === message.reply_to,
                                        );
                                        if (!quoted) return null;
                                        return (
                                          <button
                                            onClick={() => {
                                              const el =
                                                document.getElementById(
                                                  `msg-${quoted.id}`,
                                                );
                                              if (el) {
                                                el.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "center",
                                                });
                                                el.classList.add(
                                                  "bg-[#7af17a]/10",
                                                );
                                                setTimeout(
                                                  () =>
                                                    el.classList.remove(
                                                      "bg-[#7af17a]/10",
                                                    ),
                                                  2000,
                                                );
                                              }
                                            }}
                                            className="w-full text-left mb-2 pl-3 border-l-2 border-[#7af17a]/40 bg-background/30 rounded-r-lg py-1.5 pr-2"
                                          >
                                            <p className="text-[10px] font-semibold text-[#7af17a]/70 mb-0.5">
                                              {quoted.sender_id ===
                                              currentUserId
                                                ? "Moi"
                                                : quoted.sender?.full_name ||
                                                  "Utilisateur"}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/60 truncate">
                                              {quoted.content || "Message"}
                                            </p>
                                          </button>
                                        );
                                      })()}
                                    {message.message_type === "voice" &&
                                    message.file_url ? (
                                      <VoicePlayer
                                        url={message.file_url}
                                        duration={
                                          message.file_name
                                            ? parseInt(message.file_name, 10) ||
                                              0
                                            : 0
                                        }
                                      />
                                    ) : message.message_type === "image" &&
                                      message.file_url ? (
                                      <img
                                        src={message.file_url}
                                        alt="Image"
                                        className="rounded-xl max-h-60 max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                        onClick={() =>
                                          window.open(
                                            message.file_url!,
                                            "_blank",
                                          )
                                        }
                                      />
                                    ) : (
                                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                                        {message.content}
                                      </p>
                                    )}
                                    <p
                                      className={cn(
                                        "text-[10px] mt-1.5 font-medium",
                                        isOwn
                                          ? "text-muted-foreground/40 text-right"
                                          : "text-muted-foreground/40",
                                      )}
                                    >
                                      {format(
                                        new Date(message.created_at),
                                        "HH:mm",
                                      )}
                                      {message.is_edited && " · modifié"}
                                    </p>
                                    {Object.keys(messageReactions).length >
                                      0 && (
                                      <ReactionPills
                                        messageId={message.id}
                                        reactions={messageReactions}
                                        currentUserId={currentUserId}
                                        onToggle={handleToggleReaction}
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                              {!isEditing && (
                                <div
                                  className={cn(
                                    "absolute -top-3 hidden group-hover:flex items-center gap-0.5 bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-1 py-1 z-10",
                                    isOwn ? "left-2" : "right-2",
                                  )}
                                >
                                  <button
                                    onClick={() => setReplyTo(message)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                    title="Répondre"
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                  </button>
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setEmojiPickerFor(
                                          emojiPickerFor === message.id
                                            ? null
                                            : message.id,
                                        )
                                      }
                                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                      title="Réagir"
                                    >
                                      <SmilePlus className="h-3.5 w-3.5" />
                                    </button>
                                    {emojiPickerFor === message.id && (
                                      <QuickEmojiPicker
                                        onSelect={(emoji) =>
                                          handleToggleReaction(
                                            message.id,
                                            emoji,
                                          )
                                        }
                                        onClose={() => setEmojiPickerFor(null)}
                                      />
                                    )}
                                  </div>
                                  {isOwn && (
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(message.id);
                                        setEditContent(message.content || "");
                                      }}
                                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                      title="Modifier"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {(isOwn || isAdmin) && (
                                    <button
                                      onClick={() =>
                                        handleDeleteMessage(message.id)
                                      }
                                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "group relative flex gap-3 px-2 -mx-2 rounded-xl transition-colors",
                                isGrouped ? "pt-0.5" : "pt-3",
                                "hover:bg-secondary/30",
                              )}
                            >
                              <div className="w-9 shrink-0 pt-0.5">
                                {!isGrouped && (
                                  <div
                                    className={cn(
                                      "h-9 w-9 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shadow-sm",
                                      getAvatarColor(senderId),
                                    )}
                                  >
                                    {getInitials(senderName)}
                                  </div>
                                )}
                                {isGrouped && (
                                  <span className="hidden group-hover:block text-[10px] text-muted-foreground/40 text-center leading-9 font-medium">
                                    {format(
                                      new Date(message.created_at),
                                      "HH:mm",
                                    )}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {!isGrouped && (
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="text-[13px] font-semibold text-foreground">
                                      {senderName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/40 font-medium">
                                      {format(
                                        new Date(message.created_at),
                                        "HH:mm",
                                        { locale: fr },
                                      )}
                                    </span>
                                    {message.is_edited && (
                                      <span className="text-[10px] text-muted-foreground/30">
                                        (modifié)
                                      </span>
                                    )}
                                  </div>
                                )}
                                {isEditing ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      value={editContent}
                                      onChange={(e) =>
                                        setEditContent(e.target.value)
                                      }
                                      className="min-h-[60px] text-[13px] rounded-xl"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          handleEditMessage(message.id);
                                        }
                                        if (e.key === "Escape") {
                                          setEditingMessageId(null);
                                          setEditContent("");
                                        }
                                      }}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() =>
                                          handleEditMessage(message.id)
                                        }
                                      >
                                        Enregistrer
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs rounded-lg"
                                        onClick={() => {
                                          setEditingMessageId(null);
                                          setEditContent("");
                                        }}
                                      >
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    {message.reply_to &&
                                      (() => {
                                        const quoted = messages.find(
                                          (m) => m.id === message.reply_to,
                                        );
                                        if (!quoted) return null;
                                        return (
                                          <button
                                            onClick={() => {
                                              const el =
                                                document.getElementById(
                                                  `msg-${quoted.id}`,
                                                );
                                              if (el) {
                                                el.scrollIntoView({
                                                  behavior: "smooth",
                                                  block: "center",
                                                });
                                                el.classList.add(
                                                  "bg-[#7af17a]/10",
                                                );
                                                setTimeout(
                                                  () =>
                                                    el.classList.remove(
                                                      "bg-[#7af17a]/10",
                                                    ),
                                                  2000,
                                                );
                                              }
                                            }}
                                            className="w-full text-left mb-1.5 pl-3 border-l-2 border-[#7af17a]/40 bg-secondary/30 rounded-r-lg py-1.5 pr-2"
                                          >
                                            <p className="text-[10px] font-semibold text-[#7af17a]/70 mb-0.5">
                                              {quoted.sender_id ===
                                              currentUserId
                                                ? "Moi"
                                                : quoted.sender?.full_name ||
                                                  "Utilisateur"}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground/60 truncate">
                                              {quoted.content || "Message"}
                                            </p>
                                          </button>
                                        );
                                      })()}
                                    {message.message_type === "voice" &&
                                    message.file_url ? (
                                      <VoicePlayer
                                        url={message.file_url}
                                        duration={
                                          message.file_name
                                            ? parseInt(message.file_name, 10) ||
                                              0
                                            : 0
                                        }
                                      />
                                    ) : message.message_type === "image" &&
                                      message.file_url ? (
                                      <img
                                        src={message.file_url}
                                        alt="Image"
                                        className="rounded-xl max-h-60 max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity mt-0.5"
                                        onClick={() =>
                                          window.open(
                                            message.file_url!,
                                            "_blank",
                                          )
                                        }
                                      />
                                    ) : (
                                      <p className="text-[13px] text-foreground/85 whitespace-pre-wrap break-words leading-relaxed">
                                        {message.content}
                                      </p>
                                    )}
                                    <ReactionPills
                                      messageId={message.id}
                                      reactions={messageReactions}
                                      currentUserId={currentUserId}
                                      onToggle={handleToggleReaction}
                                    />
                                  </>
                                )}
                              </div>
                              {!isEditing && (
                                <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-popover/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-lg px-1 py-1">
                                  <button
                                    onClick={() => setReplyTo(message)}
                                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                    title="Répondre"
                                  >
                                    <Reply className="h-3.5 w-3.5" />
                                  </button>
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setEmojiPickerFor(
                                          emojiPickerFor === message.id
                                            ? null
                                            : message.id,
                                        )
                                      }
                                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                      title="Réagir"
                                    >
                                      <SmilePlus className="h-3.5 w-3.5" />
                                    </button>
                                    {emojiPickerFor === message.id && (
                                      <QuickEmojiPicker
                                        onSelect={(emoji) =>
                                          handleToggleReaction(
                                            message.id,
                                            emoji,
                                          )
                                        }
                                        onClose={() => setEmojiPickerFor(null)}
                                      />
                                    )}
                                  </div>
                                  {isOwn && (
                                    <button
                                      onClick={() => {
                                        setEditingMessageId(message.id);
                                        setEditContent(message.content || "");
                                      }}
                                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                                      title="Modifier"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {(isOwn || isAdmin) && (
                                    <button
                                      onClick={() =>
                                        handleDeleteMessage(message.id)
                                      }
                                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {imagePreview && (
              <div className="px-5 pb-2">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="h-20 rounded-xl object-cover shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl(null);
                    }}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground/80 flex items-center justify-center text-background hover:bg-foreground transition-colors shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {replyTo && (
              <div className="px-5 pt-3 pb-1">
                <div className="flex items-center gap-3 pl-3 border-l-2 border-[#7af17a]/50 bg-secondary/30 rounded-r-xl py-2 pr-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#7af17a]/80 mb-0.5 flex items-center gap-1.5">
                      <Reply className="h-3 w-3" />
                      Réponse à{" "}
                      {replyTo.sender_id === currentUserId
                        ? "moi-même"
                        : replyTo.sender?.full_name || "Utilisateur"}
                    </p>
                    <p className="text-[12px] text-muted-foreground/60 truncate">
                      {replyTo.content || "Message"}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="px-5 py-4 border-t border-border/50">
              {typingUsers.length > 0 && (
                <div className="mb-2">
                  <TypingIndicator users={typingUsers} />
                </div>
              )}
              {isRecording ? (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={cancelRecording}
                    title="Annuler"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 flex items-center gap-3 bg-secondary/40 rounded-2xl px-4 py-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[13px] text-red-400 font-medium tabular-nums">
                      {Math.floor(recordingDuration / 60)}:
                      {(recordingDuration % 60).toString().padStart(2, "0")}
                    </span>
                    <div className="flex-1 flex items-center gap-0.5">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-1 rounded-full bg-red-500/30"
                          style={{
                            height: `${Math.random() * 12 + 4}px`,
                            opacity: i < (recordingDuration % 20) + 5 ? 1 : 0.3,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Enregistrement...
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    className="shrink-0 h-9 w-9 rounded-xl bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 shadow-sm shadow-[#7af17a]/30"
                    onClick={stopRecording}
                    title="Envoyer"
                    disabled={uploadingVoice}
                  >
                    {uploadingVoice ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  className="flex items-end gap-2.5"
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 h-9 w-9 mb-0.5 rounded-xl"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex-1 relative">
                    <Textarea
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyDown={handleInputKeyDown}
                      placeholder={
                        activeChannel.type === "direct"
                          ? `Message à ${activePartner?.full_name || "utilisateur"}...`
                          : `Message dans #${activeChannel.name}...`
                      }
                      className="min-h-[44px] max-h-[120px] resize-none text-[13px] py-3 pr-12 rounded-2xl bg-secondary/40 border-border/50 focus-visible:ring-[#7af17a]/30 placeholder:text-muted-foreground/40"
                      rows={1}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className={cn(
                        "absolute right-2 bottom-2 h-8 w-8 rounded-xl transition-all duration-200",
                        newMessage.trim() || imageUrl
                          ? "bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90 shadow-sm shadow-[#7af17a]/30"
                          : "bg-secondary text-muted-foreground/40",
                      )}
                      disabled={!newMessage.trim() && !imageUrl}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  {!newMessage.trim() && !imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9 mb-0.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={startRecording}
                      title="Message vocal"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  )}
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#7af17a]/10 to-[#7af17a]/5 flex items-center justify-center shadow-inner">
              <MessageSquare className="h-10 w-10 text-[#7af17a]/30" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-base text-foreground/70">
                Sélectionnez une conversation
              </p>
              <p className="text-[13px] text-muted-foreground/40 mt-1 max-w-xs">
                Choisissez un channel, un message direct ou une conversation
                pour commencer
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* DIALOGS                                                           */}
      {/* ================================================================= */}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Créer un channel</DialogTitle>
            <DialogDescription>
              Ajoutez un nouveau channel de discussion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Nom</Label>
              <Input
                id="channel-name"
                placeholder="ex: général, ventes, support..."
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-desc">Description (optionnel)</Label>
              <Input
                id="channel-desc"
                placeholder="De quoi parle ce channel ?"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={newChannelType}
                onValueChange={(v) =>
                  setNewChannelType(v as "group" | "direct" | "announcement")
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="group">Groupe</SelectItem>
                  <SelectItem value="announcement">Annonce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Membres ({selectedMemberIds.length})</Label>
              <Input
                placeholder="Rechercher..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-9 text-sm rounded-xl"
              />
              <ScrollArea className="h-40 border rounded-xl p-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-secondary cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.includes(user.id)}
                          onCheckedChange={() => toggleMember(user.id)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                              getAvatarColor(user.id),
                            )}
                          >
                            {getInitials(user.full_name)}
                          </div>
                          <span className="text-sm truncate">
                            {user.full_name || "Sans nom"}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">
                            {user.role}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateChannel}
              disabled={saving}
              className="rounded-xl bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{" "}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewDMDialog} onOpenChange={setShowNewDMDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-4.5 w-4.5" /> Nouveau message
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un membre pour démarrer une conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Rechercher un membre..."
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl"
                autoFocus
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {filteredDMUsers.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-all text-left"
                    onClick={() => handleStartDM(user.id)}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm",
                        getAvatarColor(user.id),
                      )}
                    >
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">
                        {user.full_name || "Sans nom"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/60 capitalize">
                        {user.role}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredDMUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground/50 text-center py-6">
                    Aucun membre trouvé
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Membres — {channelToManage?.name}
            </DialogTitle>
            <DialogDescription>
              Gérez les membres de ce channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Rechercher..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-9 text-sm rounded-xl"
            />
            <ScrollArea className="h-56 border rounded-xl p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-secondary cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                            getAvatarColor(user.id),
                          )}
                        >
                          {getInitials(user.full_name)}
                        </div>
                        <span className="text-sm truncate">
                          {user.full_name || "Sans nom"}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground/60">
              {selectedMemberIds.length} membre
              {selectedMemberIds.length > 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMembersDialog(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateMembers}
              disabled={saving}
              className="rounded-xl bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{" "}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Supprimer le channel</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{channelToManage?.name}
              &quot; ? Tous les messages seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-xl"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={saving}
              className="rounded-xl"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{" "}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
