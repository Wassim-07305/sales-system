"use client";

import { useState, useMemo, useCallback } from "react";
import {
  X,
  Hash,
  Lock,
  Megaphone,
  Users,
  Trash2,
  LogOut,
  Shield,
  UserPlus,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/lib/hooks/use-user";
import type { ChannelWithMeta } from "@/lib/types/messaging";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const STAFF_ROLES = ["admin", "manager"];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  setter: "Setter",
  closer: "Closer",
  client_b2b: "Client B2B",
  client_b2c: "Client B2C",
};

interface ChannelMember {
  profile_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
  };
}

interface ChannelSettingsModalProps {
  channel: ChannelWithMeta;
  open: boolean;
  onClose: () => void;
  onUpdateChannel: (data: { name?: string; description?: string }) => void;
  onDeleteChannel: () => void;
  onLeaveChannel: () => void;
  onAddMember: (profileId: string) => void;
  onRemoveMember: (profileId: string) => void;
  isUpdating: boolean;
}

export function ChannelSettingsModal({
  channel,
  open,
  onClose,
  onUpdateChannel,
  onDeleteChannel,
  onLeaveChannel,
  onAddMember,
  onRemoveMember,
  isUpdating,
}: ChannelSettingsModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile: currentProfile } = useUser();

  const [activeTab, setActiveTab] = useState<"general" | "members">("general");
  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isStaff = currentProfile
    ? STAFF_ROLES.includes(currentProfile.role)
    : false;
  const isCreator = channel.created_by === user?.id;
  const canEdit = isStaff || isCreator;

  // Fetch channel members
  const { data: members = [] } = useQuery({
    queryKey: ["channel-members", channel.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channel_members")
        .select(
          `profile_id, role, profile:profiles!profile_id(id, full_name, avatar_url, role)`,
        )
        .eq("channel_id", channel.id);
      if (error) throw error;
      // Sanitize: profile FK join may return array instead of object
      return ((data ?? []) as unknown as ChannelMember[]).map((m) => ({
        ...m,
        profile: Array.isArray(m.profile) ? m.profile[0] : m.profile,
      }));
    },
    enabled: open,
  });

  // Fetch all profiles for add member
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all-profiles-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && showAddMember,
  });

  const memberIds = useMemo(
    () => new Set(members.map((m) => m.profile_id)),
    [members],
  );

  const availableProfiles = useMemo(() => {
    return allProfiles.filter((p) => {
      if (memberIds.has(p.id)) return false;
      if (!memberSearch) return true;
      return p.full_name?.toLowerCase().includes(memberSearch.toLowerCase());
    });
  }, [allProfiles, memberIds, memberSearch]);

  const handleSave = useCallback(() => {
    onUpdateChannel({
      name: name.trim() || undefined,
      description: description.trim() || undefined,
    });
  }, [name, description, onUpdateChannel]);

  const isDM = channel.type === "direct";

  const channelIcon = isDM ? (
    <Lock className="h-5 w-5" />
  ) : channel.type === "announcement" ? (
    <Megaphone className="h-5 w-5 text-primary" />
  ) : (
    <Hash className="h-5 w-5" />
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              {channelIcon}
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {isDM ? "Message direct" : channel.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                Paramètres du canal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab("general")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Général
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === "members"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Membres ({members.length})
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "general" && (
            <div className="space-y-4">
              {/* Name */}
              {!isDM && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom du canal</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!canEdit}
                    className="h-9"
                  />
                </div>
              )}

              {/* Description */}
              {!isDM && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Description du canal..."
                    className="h-9"
                  />
                </div>
              )}

              {/* Info */}
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="outline" className="capitalize">
                    {channel.type === "direct"
                      ? "Direct"
                      : channel.type === "announcement"
                        ? "Annonce"
                        : "Groupe"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Membres</span>
                  <span>{members.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Créé le</span>
                  <span className="text-xs">
                    {new Date(channel.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Save */}
              {canEdit && !isDM && (
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="w-full"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              )}

              {/* Danger zone */}
              <div className="space-y-2 pt-4 border-t">
                <p className="text-xs font-medium text-destructive">
                  Zone de danger
                </p>
                <Button
                  variant="outline"
                  onClick={onLeaveChannel}
                  className="w-full justify-start text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Quitter le canal
                </Button>
                {canEdit && !confirmDelete && (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDelete(true)}
                    className="w-full justify-start text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer le canal
                  </Button>
                )}
                {canEdit && confirmDelete && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                    <p className="text-xs text-destructive font-medium">
                      Êtes-vous sûr de vouloir supprimer ce canal ? Cette action est irréversible.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1"
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={onDeleteChannel}
                        className="flex-1"
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Confirmer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "members" && (
            <div className="space-y-3">
              {/* Add member button */}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="w-full"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter un membre
                </Button>
              )}

              {/* Add member search */}
              {showAddMember && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Rechercher..."
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                    {availableProfiles.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onAddMember(p.id);
                          setMemberSearch("");
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted transition-colors"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={p.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                            {p.full_name ? getInitials(p.full_name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs flex-1 truncate">
                          {p.full_name ?? "Sans nom"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {ROLE_LABELS[p.role] ?? p.role}
                        </span>
                      </button>
                    ))}
                    {availableProfiles.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-2">
                        Aucun profil disponible
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="space-y-0.5">
                {members.map((member) => {
                  const p = member.profile;
                  const isSelf = p.id === user?.id;
                  const memberIsStaff = STAFF_ROLES.includes(p.role);

                  return (
                    <div
                      key={member.profile_id}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {p.full_name ? getInitials(p.full_name) : "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              memberIsStaff && "text-primary",
                            )}
                          >
                            {p.full_name ?? "Sans nom"}
                          </span>
                          {isSelf && (
                            <span className="text-[10px] text-muted-foreground">
                              (vous)
                            </span>
                          )}
                          {memberIsStaff && (
                            <Shield className="h-3 w-3 text-primary" />
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {ROLE_LABELS[p.role] ?? p.role}
                        </p>
                      </div>
                      {canEdit && !isSelf && (
                        <button
                          onClick={() => onRemoveMember(member.profile_id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Retirer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
