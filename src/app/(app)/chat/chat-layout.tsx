"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  Check,
  ChevronDown,
  UserPlus,
  AtSign,
  ArrowLeft,
} from "lucide-react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
// All chat operations are done client-side via Supabase to avoid server action re-render issues
import {
  createChannel,
  deleteChannel,
  updateChannelMembers,
  getChannelMembers,
  getAllUsers,
} from "@/lib/actions/chat-admin";
import { usePresence } from "@/lib/hooks/use-presence";
import { TypingIndicator } from "@/components/typing-indicator";
import { OnlineStatus } from "@/components/online-status";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatLayoutProps {
  initialChannels: Channel[];
  currentUserId: string;
  initialUnreadCounts: Record<string, number>;
  userRole: UserRole;
  teamMembers: TeamMember[];
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

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👀", "🙏", "✅", "💯", "👏"];
const ADMIN_ROLES: UserRole[] = ["admin", "manager"];
const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
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

function getAvatarColor(id: string): string {
  const colors = [
    "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-purple-600",
    "bg-pink-600", "bg-cyan-600", "bg-rose-600", "bg-indigo-600",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DateSeparator({ date }: { date: Date }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground bg-card px-3 py-0.5 rounded-full border">
        {getDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-border" />
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
  reactions: Record<string, { count: number; userIds: string[]; userNames: string[] }>;
  currentUserId: string;
  onToggle: (messageId: string, emoji: string) => void;
}) {
  const emojis = Object.keys(reactions);
  if (emojis.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
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
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors border",
                    hasReacted
                      ? "bg-[#7af17a]/15 border-[#7af17a]/30 text-[#7af17a]"
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted hover:border-border",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{data.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
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
      className="absolute bottom-full right-0 mb-1 z-50 bg-popover border rounded-xl shadow-xl p-2 animate-in fade-in-0 zoom-in-95"
      onMouseLeave={onClose}
    >
      <div className="grid grid-cols-6 gap-0.5">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-base transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(initialUnreadCounts);

  // ---- Image upload ----
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // ---- Reactions ----
  const [rawReactions, setRawReactions] = useState<RawReaction[]>([]);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);

  // ---- Editing ----
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

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
  const [newChannelType, setNewChannelType] = useState<"group" | "direct" | "announcement">("group");
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
    const map: Record<string, Record<string, { count: number; userIds: string[]; userNames: string[] }>> = {};
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

  // Get DM partner name
  function getDMPartner(channel: Channel): TeamMember | undefined {
    if (channel.type !== "direct" || !channel.members) return undefined;
    const otherId = channel.members.find((id: string) => id !== currentUserId);
    return teamMembers.find((m) => m.id === otherId);
  }

  // ---- Callbacks ----

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Load reactions for a set of message IDs
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
            user_name: (
              Array.isArray(r.user)
                ? (r.user[0] as Record<string, unknown>)?.full_name
                : (r.user as Record<string, unknown>)?.full_name
            ) as string || "",
          })),
        );
      }
    },
    [supabase],
  );

  // Load older messages
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
      // Load reactions for new messages
      loadReactions([...reversed.map((m: Message) => m.id), ...messages.map((m) => m.id)]);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [activeChannel, messages, loadingMore, supabase, loadReactions]);

  // ---- Effects ----

  // Load messages + reactions when channel changes
  useEffect(() => {
    if (!activeChannel) return;

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

      // Load reactions
      if (sorted.length > 0) {
        loadReactions(sorted.map((m: Message) => m.id));
      }
    }

    loadMessages();
    // Mark channel as read (inline, no server action)
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

    // Realtime: new messages
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
              // Mark as read inline
              const chId = activeChannel!.id;
              supabase
                .from("channel_reads")
                .select("id")
                .eq("channel_id", chId)
                .eq("user_id", currentUserId)
                .maybeSingle()
                .then(({ data: ex }) => {
                  if (ex) {
                    supabase.from("channel_reads").update({ last_read_at: new Date().toISOString() }).eq("id", ex.id).then(() => {});
                  } else {
                    supabase.from("channel_reads").insert({ channel_id: chId, user_id: currentUserId, last_read_at: new Date().toISOString() }).then(() => {});
                  }
                });
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setMessages((prev) => prev.filter((m) => m.id !== deletedId));
          } else if (payload.eventType === "UPDATE") {
            const updatedId = payload.new.id;
            const { data: fullMessage } = await supabase
              .from("messages")
              .select("*, sender:profiles(*)")
              .eq("id", updatedId)
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

    // Realtime: reactions
    const reactionSub = supabase
      .channel(`reactions:${activeChannel.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => {
          // Reload all reactions for current messages
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
  }, [activeChannel, supabase, scrollToBottom, loadReactions]);

  // ---- Handlers ----

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
      reply_to: null,
      file_name: null,
    } as unknown as Message;

    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setTyping(false);
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

  async function handleToggleReaction(messageId: string, emoji: string) {
    const userId = currentUserId;

    // Check if reaction already exists
    const existing = rawReactions.find(
      (r) => r.message_id === messageId && r.user_id === userId && r.emoji === emoji,
    );

    // Optimistic update
    setRawReactions((prev) => {
      if (existing) {
        return prev.filter((r) => r.id !== existing.id);
      } else {
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
      }
    });
    setEmojiPickerFor(null);

    try {
      if (existing && !existing.id.startsWith("optimistic")) {
        await supabase.from("message_reactions").delete().eq("id", existing.id);
      } else {
        // Check server-side if exists
        const { data: serverExisting } = await supabase
          .from("message_reactions")
          .select("id")
          .eq("message_id", messageId)
          .eq("user_id", userId)
          .eq("emoji", emoji)
          .maybeSingle();

        if (serverExisting) {
          await supabase.from("message_reactions").delete().eq("id", serverExisting.id);
        } else {
          await supabase.from("message_reactions").insert({
            message_id: messageId,
            user_id: userId,
            emoji,
          });
        }
      }
    } catch {
      const ids = messages.map((m) => m.id);
      loadReactions(ids);
    }
  }

  async function handleEditMessage(messageId: string) {
    if (!editContent.trim()) return;
    try {
      const { error } = await supabase
        .from("messages")
        .update({ content: editContent.trim(), is_edited: true })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);
      if (error) throw error;
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
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  async function handleStartDM(otherUserId: string) {
    setShowNewDMDialog(false);
    try {
      // Check for existing DM between these two users
      const { data: existingChannels } = await supabase
        .from("channels")
        .select("*")
        .eq("type", "direct")
        .contains("members", [currentUserId, otherUserId]);

      const existingDM = existingChannels?.find(
        (c) =>
          c.members?.length === 2 &&
          c.members.includes(currentUserId) &&
          c.members.includes(otherUserId),
      );

      if (existingDM) {
        setActiveChannel(existingDM);
        return;
      }

      // Get names for the channel
      const partner = teamMembers.find((m) => m.id === otherUserId);
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", currentUserId)
        .single();

      const { data: newChannel, error } = await supabase
        .from("channels")
        .insert({
          name: `${myProfile?.full_name || "Utilisateur"} & ${partner?.full_name || "Utilisateur"}`,
          type: "direct",
          created_by: currentUserId,
          members: [currentUserId, otherUserId],
        })
        .select("*")
        .single();

      if (error) throw error;

      // Refresh channels list
      const { data: allChannels } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(allChannels || []);
      setActiveChannel(newChannel);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création du DM");
    }
  }

  // ---- Admin handlers ----

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
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  // ---- Filtered data ----

  const filteredGroupChannels = groupChannels.filter(
    (c) => !channelSearch || c.name.toLowerCase().includes(channelSearch.toLowerCase()),
  );
  const filteredDMChannels = dmChannels.filter((c) => {
    if (!channelSearch) return true;
    const partner = getDMPartner(c);
    return (
      c.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
      (partner?.full_name || "").toLowerCase().includes(channelSearch.toLowerCase())
    );
  });

  const filteredUsers = allUsers.filter(
    (u) =>
      !memberSearch ||
      (u.full_name || "").toLowerCase().includes(memberSearch.toLowerCase()),
  );

  const filteredDMUsers = teamMembers.filter(
    (u) =>
      u.id !== currentUserId &&
      (!dmSearch || (u.full_name || "").toLowerCase().includes(dmSearch.toLowerCase())),
  );

  // Active channel display info
  const activePartner = activeChannel ? getDMPartner(activeChannel) : undefined;
  const activeName =
    activeChannel?.type === "direct"
      ? activePartner?.full_name || "Message direct"
      : activeChannel?.name || "";

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="flex h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)] gap-0 rounded-xl overflow-hidden border bg-card">
      {/* ================================================================= */}
      {/* SIDEBAR                                                           */}
      {/* ================================================================= */}
      <div
        className={cn(
          "w-full md:w-72 flex-shrink-0 flex flex-col border-r bg-muted/30",
          activeChannel ? "hidden md:flex" : "flex",
        )}
      >
        {/* Sidebar header */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="pl-9 h-8 text-sm bg-background/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Channels section */}
          <div className="px-2 pt-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <button className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" />
                Channels
              </button>
              {isAdmin && (
                <button
                  onClick={openCreateDialog}
                  className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Créer un channel"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="space-y-px">
              {filteredGroupChannels.map((channel) => {
                const isAnnouncement = channel.type === "announcement";
                const Icon = isAnnouncement ? Megaphone : Hash;
                const unread = unreadCounts[channel.id] || 0;
                const isActive = activeChannel?.id === channel.id;

                return (
                  <div key={channel.id} className="group flex items-center">
                    <button
                      className={cn(
                        "flex-1 flex items-center gap-2 px-2 py-1 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-[#7af17a]/10 text-[#7af17a] font-medium"
                          : unread > 0
                            ? "text-foreground font-semibold hover:bg-muted/50"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                      onClick={() => setActiveChannel(channel)}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate flex-1 text-left">{channel.name}</span>
                      {unread > 0 && (
                        <span className="bg-[#7af17a] text-black text-[10px] font-bold h-4.5 min-w-4.5 flex items-center justify-center px-1 rounded-full">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </button>
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => openMembersDialog(channel)}>
                            <Users className="h-3.5 w-3.5 mr-2" />
                            Gérer les membres
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setChannelToManage(channel);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
              {filteredGroupChannels.length === 0 && !channelSearch && (
                <p className="text-[11px] text-muted-foreground/60 px-2 py-2">
                  {isAdmin ? "Créez votre premier channel" : "Aucun channel"}
                </p>
              )}
            </div>
          </div>

          {/* DMs section */}
          <div className="px-2 pt-4 pb-3">
            <div className="flex items-center justify-between px-2 mb-1">
              <button className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                <ChevronDown className="h-3 w-3" />
                Messages directs
              </button>
              <button
                onClick={() => {
                  setDmSearch("");
                  setShowNewDMDialog(true);
                }}
                className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Nouveau message"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-px">
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
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-[#7af17a]/10 text-[#7af17a] font-medium"
                        : unread > 0
                          ? "text-foreground font-semibold hover:bg-muted/50"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                    onClick={() => setActiveChannel(channel)}
                  >
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white",
                          partner ? getAvatarColor(partner.id) : "bg-muted",
                        )}
                      >
                        {getInitials(partner?.full_name)}
                      </div>
                      {isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#7af17a] border-2 border-card" />
                      )}
                    </div>
                    <span className="truncate flex-1 text-left">
                      {partner?.full_name || "Utilisateur"}
                    </span>
                    {unread > 0 && (
                      <span className="bg-[#7af17a] text-black text-[10px] font-bold h-4.5 min-w-4.5 flex items-center justify-center px-1 rounded-full">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </button>
                );
              })}
              {filteredDMChannels.length === 0 && !channelSearch && (
                <p className="text-[11px] text-muted-foreground/60 px-2 py-2">
                  Cliquez + pour envoyer un message
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* ================================================================= */}
      {/* MESSAGE AREA                                                      */}
      {/* ================================================================= */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          !activeChannel && "hidden md:flex",
        )}
      >
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card">
              <button
                onClick={() => setActiveChannel(null)}
                className="md:hidden text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {activeChannel.type === "direct" && activePartner ? (
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white",
                        getAvatarColor(activePartner.id),
                      )}
                    >
                      {getInitials(activePartner.full_name)}
                    </div>
                    <OnlineStatus
                      isOnline={onlineUsers.some((u) => u.userId === activePartner.id)}
                    />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm leading-tight">
                      {activePartner.full_name || "Utilisateur"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {activePartner.role}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {activeChannel.type === "announcement" ? (
                    <Megaphone className="h-4.5 w-4.5 text-muted-foreground" />
                  ) : (
                    <Hash className="h-4.5 w-4.5 text-muted-foreground" />
                  )}
                  <div>
                    <h2 className="font-semibold text-sm leading-tight">
                      {activeChannel.name}
                    </h2>
                    {activeChannel.description && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-md">
                        {activeChannel.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="ml-auto flex items-center gap-1.5">
                {onlineUsers.length > 0 && activeChannel.type !== "direct" && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-2">
                    <div className="h-2 w-2 rounded-full bg-[#7af17a]" />
                    {onlineUsers.length} en ligne
                  </div>
                )}
                {isAdmin && activeChannel.type !== "direct" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openMembersDialog(activeChannel)}
                    >
                      <Users className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => {
                        setChannelToManage(activeChannel);
                        setShowDeleteConfirm(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1">
              <div className="px-4 py-2">
                {loading ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Chargement...
                  </div>
                ) : (
                  <>
                    {messages.length === 0 && !hasMore && (
                      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                          <MessageSquare className="h-7 w-7 opacity-40" />
                        </div>
                        <p className="font-medium text-sm">
                          {activeChannel.type === "direct"
                            ? `Commencez une conversation avec ${activePartner?.full_name || "cet utilisateur"}`
                            : `Bienvenue dans #${activeChannel.name}`}
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground/60">
                          Envoyez le premier message !
                        </p>
                      </div>
                    )}

                    {hasMore && (
                      <div className="text-center py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={loadOlderMessages}
                          disabled={loadingMore}
                          className="text-xs text-muted-foreground"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Chargement...
                            </>
                          ) : (
                            "Charger les messages précédents"
                          )}
                        </Button>
                      </div>
                    )}

                    {/* Render messages with grouping and date separators */}
                    {messages.map((message, index) => {
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const isGrouped = prevMessage ? shouldGroup(prevMessage, message) : false;
                      const isOwn = message.sender_id === currentUserId;
                      const senderName = isOwn
                        ? "Moi"
                        : message.sender?.full_name || message.sender?.email || "Utilisateur";
                      const senderId = message.sender_id || "";
                      const isEditing = editingMessageId === message.id;
                      const messageReactions = groupedReactions[message.id] || {};

                      // Date separator
                      const showDate =
                        !prevMessage ||
                        !isSameDay(
                          new Date(prevMessage.created_at),
                          new Date(message.created_at),
                        );

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <DateSeparator date={new Date(message.created_at)} />
                          )}

                          {/* Message row */}
                          <div
                            className={cn(
                              "group relative flex gap-3 px-1 -mx-1 rounded-md transition-colors",
                              isGrouped ? "pt-0.5" : "pt-3",
                              "hover:bg-muted/30",
                            )}
                          >
                            {/* Avatar or spacer */}
                            <div className="w-8 shrink-0 pt-0.5">
                              {!isGrouped && (
                                <div
                                  className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white",
                                    getAvatarColor(senderId),
                                  )}
                                >
                                  {getInitials(senderName === "Moi" ? senderName : senderName)}
                                </div>
                              )}
                              {isGrouped && (
                                <span className="hidden group-hover:block text-[10px] text-muted-foreground/60 text-center leading-8">
                                  {format(new Date(message.created_at), "HH:mm")}
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {!isGrouped && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-foreground">
                                    {senderName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(message.created_at), "HH:mm", {
                                      locale: fr,
                                    })}
                                  </span>
                                  {message.is_edited && (
                                    <span className="text-[10px] text-muted-foreground/50">
                                      (modifié)
                                    </span>
                                  )}
                                </div>
                              )}

                              {isEditing ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[60px] text-sm"
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
                                      className="h-7 text-xs"
                                      onClick={() => handleEditMessage(message.id)}
                                    >
                                      Enregistrer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 text-xs"
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
                                  {message.message_type === "image" && message.file_url ? (
                                    <img
                                      src={message.file_url}
                                      alt="Image"
                                      className="rounded-lg max-h-60 max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity mt-0.5"
                                      onClick={() => window.open(message.file_url!, "_blank")}
                                    />
                                  ) : (
                                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">
                                      {message.content}
                                    </p>
                                  )}

                                  {/* Reactions */}
                                  <ReactionPills
                                    messageId={message.id}
                                    reactions={messageReactions}
                                    currentUserId={currentUserId}
                                    onToggle={handleToggleReaction}
                                  />
                                </>
                              )}
                            </div>

                            {/* Hover toolbar */}
                            {!isEditing && (
                              <div className="absolute -top-3 right-2 hidden group-hover:flex items-center gap-0.5 bg-popover border rounded-md shadow-sm px-0.5 py-0.5">
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setEmojiPickerFor(
                                        emojiPickerFor === message.id ? null : message.id,
                                      )
                                    }
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Réagir"
                                  >
                                    <SmilePlus className="h-3.5 w-3.5" />
                                  </button>
                                  {emojiPickerFor === message.id && (
                                    <QuickEmojiPicker
                                      onSelect={(emoji) =>
                                        handleToggleReaction(message.id, emoji)
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
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Modifier"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {(isOwn || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteMessage(message.id)}
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Image preview */}
            {imagePreview && (
              <div className="px-4 pb-2">
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Aperçu"
                    className="h-20 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageUrl(null);
                    }}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Typing indicator + input */}
            <div className="px-4 py-3 border-t">
              {typingUsers.length > 0 && (
                <div className="mb-2">
                  <TypingIndicator users={typingUsers} />
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 mb-px"
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
                    className="min-h-[40px] max-h-[120px] resize-none text-sm py-2.5 pr-10"
                    rows={1}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className={cn(
                      "absolute right-1.5 bottom-1.5 h-7 w-7 rounded-md transition-colors",
                      newMessage.trim() || imageUrl
                        ? "bg-[#7af17a] text-black hover:bg-[#7af17a]/90"
                        : "bg-muted text-muted-foreground",
                    )}
                    disabled={!newMessage.trim() && !imageUrl}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 opacity-30" />
            </div>
            {channels.length === 0 ? (
              <>
                <p className="font-medium text-sm">Aucun channel disponible</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs text-center">
                  {isAdmin
                    ? "Créez votre premier channel pour commencer."
                    : "Votre administrateur n'a pas encore configuré les channels."}
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-sm">Sélectionnez une conversation</p>
                <p className="text-xs text-muted-foreground/60">
                  Choisissez un channel ou envoyez un message direct
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* DIALOGS                                                           */}
      {/* ================================================================= */}

      {/* Dialog: Créer un channel */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un channel</DialogTitle>
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
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-desc">Description (optionnel)</Label>
              <Input
                id="channel-desc"
                placeholder="De quoi parle ce channel ?"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Groupe</SelectItem>
                  <SelectItem value="announcement">Annonce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Membres ({selectedMemberIds.length})
              </Label>
              <Input
                placeholder="Rechercher..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <ScrollArea className="h-40 border rounded-md p-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.includes(user.id)}
                          onCheckedChange={() => toggleMember(user.id)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className={cn(
                              "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0",
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateChannel} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nouveau DM */}
      <Dialog open={showNewDMDialog} onOpenChange={setShowNewDMDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Nouveau message
            </DialogTitle>
            <DialogDescription>
              Sélectionnez un membre pour démarrer une conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher un membre..."
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-0.5">
                {filteredDMUsers.map((user) => (
                  <button
                    key={user.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-left"
                    onClick={() => handleStartDM(user.id)}
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0",
                        getAvatarColor(user.id),
                      )}
                    >
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.full_name || "Sans nom"}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {user.role}
                      </p>
                    </div>
                  </button>
                ))}
                {filteredDMUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Aucun membre trouvé
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gérer les membres */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
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
              className="h-8 text-sm"
            />
            <ScrollArea className="h-56 border rounded-md p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0",
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
            <p className="text-xs text-muted-foreground">
              {selectedMemberIds.length} membre{selectedMemberIds.length > 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdateMembers} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmer suppression */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le channel</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{channelToManage?.name}&quot; ?
              Tous les messages seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteChannel} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
