"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import type { Channel, Message, UserRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  Send,
  Hash,
  MessageCircle,
  Megaphone,
  Paperclip,
  Mic,
  Search,
  X,
  Loader2,
  Plus,
  MoreVertical,
  Trash2,
  Users,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { markChannelAsRead } from "@/lib/actions/communication";
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

interface ChatLayoutProps {
  initialChannels: Channel[];
  currentUserId: string;
  initialUnreadCounts: Record<string, number>;
  userRole: UserRole;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
}

const channelIcons = {
  group: Hash,
  direct: MessageCircle,
  announcement: Megaphone,
};

const ADMIN_ROLES: UserRole[] = ["admin", "manager"];

export function ChatLayout({
  initialChannels,
  currentUserId,
  initialUnreadCounts,
  userRole,
}: ChatLayoutProps) {
  // Stable supabase client reference
  const supabase = useMemo(() => createClient(), []);

  const isAdmin = ADMIN_ROLES.includes(userRole);

  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(
    initialChannels[0] || null,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [unreadCounts, setUnreadCounts] =
    useState<Record<string, number>>(initialUnreadCounts);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Admin state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [channelToManage, setChannelToManage] = useState<Channel | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create channel form
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [newChannelType, setNewChannelType] = useState<
    "group" | "direct" | "announcement"
  >("group");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  const { onlineUsers, typingUsers, setTyping } = usePresence(
    activeChannel?.id ? `chat:${activeChannel.id}` : null,
    currentUserId,
    "Utilisateur",
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load all users for member selection
  async function loadAllUsers() {
    if (allUsers.length > 0) return;
    setLoadingUsers(true);
    try {
      const users = await getAllUsers();
      setAllUsers(users as UserProfile[]);
    } catch {
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoadingUsers(false);
    }
  }

  const PAGE_SIZE = 50;

  // Load older messages (pagination)
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
      setMessages((prev) => [...data.reverse(), ...prev]);
      setHasMore(data.length === PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [activeChannel, messages, loadingMore, supabase]);

  // Load messages for active channel
  useEffect(() => {
    if (!activeChannel) return;

    async function loadMessages() {
      setLoading(true);
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
    }

    loadMessages();

    // Mark channel as read on open
    markChannelAsRead(activeChannel.id).then(() => {
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[activeChannel!.id];
        return next;
      });
    });

    // Subscribe to realtime messages
    const subscription = supabase
      .channel(`messages:${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        async (payload) => {
          // Skip if we already have this message (from optimistic insert)
          const newId = payload.new.id;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newId)) return prev;
            // Temporarily add a placeholder — we'll replace with full data
            return prev;
          });

          const { data: fullMessage } = await supabase
            .from("messages")
            .select("*, sender:profiles(*)")
            .eq("id", newId)
            .single();

          if (fullMessage) {
            setMessages((prev) => {
              // If already present (optimistic or duplicate), skip
              if (prev.some((m) => m.id === fullMessage.id)) return prev;
              return [...prev, fullMessage];
            });
            setTimeout(scrollToBottom, 100);
            // Keep read status current while viewing the channel
            markChannelAsRead(activeChannel!.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [activeChannel, supabase, scrollToBottom]);

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

    // Optimistic: show message immediately in the UI
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

    // Actually send to Supabase
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
      console.error("[Chat] Erreur envoi:", error);
      toast.error("Erreur : " + (error.message || "vérifiez vos permissions"));
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      return;
    }

    // Replace optimistic message with the real one from DB
    if (inserted) {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? inserted : m))
      );
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  // Admin: create channel
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
      toast.success("Channel créé avec succès");
      setShowCreateDialog(false);
      resetCreateForm();
      // Refresh channels
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(data || []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la création",
      );
    } finally {
      setSaving(false);
    }
  }

  // Admin: delete channel
  async function handleDeleteChannel() {
    if (!channelToManage) return;
    setSaving(true);
    try {
      await deleteChannel(channelToManage.id);
      toast.success("Channel supprimé");
      setShowDeleteConfirm(false);
      setChannelToManage(null);
      if (activeChannel?.id === channelToManage.id) {
        setActiveChannel(null);
      }
      // Refresh channels
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(data || []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la suppression",
      );
    } finally {
      setSaving(false);
    }
  }

  // Admin: update members
  async function handleUpdateMembers() {
    if (!channelToManage) return;
    setSaving(true);
    try {
      await updateChannelMembers(channelToManage.id, selectedMemberIds);
      toast.success("Membres mis à jour");
      setShowMembersDialog(false);
      setChannelToManage(null);
      setSelectedMemberIds([]);
      // Refresh channels
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });
      setChannels(data || []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de la mise à jour",
      );
    } finally {
      setSaving(false);
    }
  }

  // Open manage members dialog
  async function openMembersDialog(channel: Channel) {
    setChannelToManage(channel);
    await loadAllUsers();
    try {
      const members = await getChannelMembers(channel.id);
      setSelectedMemberIds(members.map((m: UserProfile) => m.id));
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

  // TODO: support envoi de messages vocaux (enregistrement micro + upload audio)

  const filteredChannels = channels.filter(
    (c) =>
      !channelSearch ||
      c.name.toLowerCase().includes(channelSearch.toLowerCase()),
  );

  const filteredUsers = allUsers.filter(
    (u) =>
      !memberSearch ||
      (u.full_name || "").toLowerCase().includes(memberSearch.toLowerCase()),
  );

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)] gap-2 md:gap-4">
      {/* Channel list */}
      <Card className={cn("w-full md:w-72 flex-shrink-0 flex flex-col", activeChannel ? "hidden md:flex" : "flex")}>
        <div className="p-3 border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-9 w-9"
                onClick={openCreateDialog}
                title="Créer un channel"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredChannels.map((channel) => {
              const Icon =
                channelIcons[channel.type as keyof typeof channelIcons] || Hash;
              const unread = unreadCounts[channel.id] || 0;
              return (
                <div key={channel.id} className="flex items-center group">
                  <button
                    className={cn(
                      "flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                      activeChannel?.id === channel.id
                        ? "bg-brand/10 text-brand-dark font-medium"
                        : unread > 0
                          ? "text-foreground font-semibold hover:bg-muted"
                          : "text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => setActiveChannel(channel)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{channel.name}</span>
                    {unread > 0 && (
                      <Badge
                        variant="default"
                        className="bg-brand text-brand-dark text-[10px] h-5 min-w-5 flex items-center justify-center px-1.5 rounded-full"
                      >
                        {unread > 99 ? "99+" : unread}
                      </Badge>
                    )}
                  </button>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openMembersDialog(channel)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Gérer les membres
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setChannelToManage(channel);
                            setShowDeleteConfirm(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
            {filteredChannels.length === 0 && (
              <div className="text-center py-6 px-3">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-xs font-medium text-muted-foreground">
                  Aucun channel disponible
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {isAdmin
                    ? "Créez votre premier channel avec le bouton + ci-dessus."
                    : "Votre administrateur n\u2019a pas encore créé de channels. Contactez-le pour démarrer."}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Messages area */}
      <Card className={cn("flex-1 flex flex-col min-h-0", !activeChannel && "hidden md:flex")}>
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="flex items-center gap-2 p-3 md:p-4 border-b">
              <button
                onClick={() => setActiveChannel(null)}
                className="md:hidden rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
              <Hash className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold truncate">{activeChannel.name}</h2>
              {activeChannel.description && (
                <span className="hidden md:inline text-sm text-muted-foreground truncate">
                  — {activeChannel.description}
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                {onlineUsers.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <OnlineStatus isOnline={true} />
                    <span className="text-xs text-muted-foreground">
                      {onlineUsers.length} en ligne
                    </span>
                  </div>
                )}
                {isAdmin && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openMembersDialog(activeChannel)}
                      title="Gérer les membres"
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        setChannelToManage(activeChannel);
                        setShowDeleteConfirm(true);
                      }}
                      title="Supprimer le channel"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Chargement...
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.length === 0 && !hasMore && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 opacity-30 mb-3" />
                      <p className="text-sm">Aucun message dans ce channel.</p>
                      <p className="text-xs mt-1">Envoyez le premier message pour lancer la conversation !</p>
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
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Chargement...</>
                        ) : (
                          "Charger les messages précédents"
                        )}
                      </Button>
                    </div>
                  )}
                  {messages.map((message) => {
                    const isOwn = message.sender_id === currentUserId;
                    const senderName = isOwn
                      ? "Moi"
                      : message.sender?.full_name || message.sender?.email || "Utilisateur";
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex gap-3",
                          isOwn && "flex-row-reverse",
                        )}
                      >
                        <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                          {senderName.charAt(0).toUpperCase()}
                        </div>
                        <div
                          className={cn("max-w-[70%]", isOwn && "text-right")}
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-medium">
                              {senderName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(message.created_at), "HH:mm", {
                                locale: fr,
                              })}
                            </span>
                          </div>
                          {message.message_type === "image" &&
                          message.file_url ? (
                            <img
                              src={message.file_url}
                              alt="Image"
                              className="rounded-xl max-h-60 max-w-xs object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() =>
                                window.open(message.file_url!, "_blank")
                              }
                            />
                          ) : (
                            <div
                              className={cn(
                                "inline-block rounded-2xl px-4 py-2 text-sm",
                                isOwn
                                  ? "bg-brand-dark text-white rounded-br-md"
                                  : "bg-muted rounded-bl-md",
                              )}
                            >
                              {message.content}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
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
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Typing indicator + Message input */}
            <div className="p-3 md:p-4 border-t">
              {typingUsers.length > 0 && (
                <div className="mb-2">
                  <TypingIndicator users={typingUsers} />
                </div>
              )}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
                {/* TODO: support envoi de messages vocaux */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled
                >
                  <Mic className="h-4 w-4 opacity-40" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Input
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder={`Message dans #${activeChannel.name}...`}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="bg-brand text-brand-dark hover:bg-brand/90 shrink-0"
                  disabled={!newMessage.trim() && !imageUrl}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10 opacity-20" />
            {channels.length === 0 ? (
              <>
                <p className="text-sm font-medium">Aucun channel disponible</p>
                <p className="text-xs text-muted-foreground/70 max-w-xs text-center">
                  {isAdmin
                    ? "Commencez par créer un channel dans le panneau de gauche."
                    : "Votre administrateur n\u2019a pas encore configuré les channels de discussion."}
                </p>
              </>
            ) : (
              <p className="text-sm">Sélectionnez un channel pour commencer</p>
            )}
          </div>
        )}
      </Card>

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
                placeholder="ex: général, annonces..."
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-desc">Description (optionnel)</Label>
              <Input
                id="channel-desc"
                placeholder="Description du channel"
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
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="announcement">Annonce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Membres ({selectedMemberIds.length} sélectionné
                {selectedMemberIds.length > 1 ? "s" : ""})
              </Label>
              <Input
                placeholder="Rechercher un membre..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="h-9"
              />
              <ScrollArea className="h-48 border rounded-md p-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Chargement...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.includes(user.id)}
                          onCheckedChange={() => toggleMember(user.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name || "Sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.role}
                          </p>
                        </div>
                      </label>
                    ))}
                    {filteredUsers.length === 0 && !loadingUsers && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aucun utilisateur trouvé
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Annuler
            </Button>
            <Button onClick={handleCreateChannel} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gérer les membres */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Gérer les membres — {channelToManage?.name}
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les membres de ce channel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Rechercher un membre..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="h-9"
            />
            <ScrollArea className="h-64 border rounded-md p-2">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Chargement...
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMemberIds.includes(user.id)}
                        onCheckedChange={() => toggleMember(user.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.role}
                        </p>
                      </div>
                    </label>
                  ))}
                  {filteredUsers.length === 0 && !loadingUsers && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Aucun utilisateur trouvé
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selectedMemberIds.length} membre
              {selectedMemberIds.length > 1 ? "s" : ""} sélectionné
              {selectedMemberIds.length > 1 ? "s" : ""}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMembersDialog(false)}
            >
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
              Êtes-vous sûr de vouloir supprimer le channel &quot;
              {channelToManage?.name}&quot; ? Tous les messages seront
              définitivement supprimés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
