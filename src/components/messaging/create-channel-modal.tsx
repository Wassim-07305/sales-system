"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Search, X, Check, Hash, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@/lib/hooks/use-user";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  setter: "Setter",
  closer: "Closer",
  client_b2b: "Client B2B",
  client_b2c: "Client B2C",
};

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    type: "group" | "direct";
    description: string;
    memberIds: string[];
  }) => void;
  isCreating: boolean;
}

export function CreateChannelModal({
  open,
  onClose,
  onCreate,
  isCreating,
}: CreateChannelModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useUser();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"group" | "direct">("group");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");

  // Fetch all profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, role")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  // Reset form on open
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setType("group");
      setSelectedMembers([]);
      setMemberSearch("");
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (p.id === user?.id) return false;
      if (!memberSearch) return true;
      return (
        p.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        p.role?.toLowerCase().includes(memberSearch.toLowerCase())
      );
    });
  }, [profiles, memberSearch, user]);

  const toggleMember = (profileId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(profileId)
        ? prev.filter((id) => id !== profileId)
        : [...prev, profileId],
    );
  };

  const handleSubmit = () => {
    if (!name.trim() && type === "group") return;
    if (selectedMembers.length === 0) return;

    // For DM, auto-name it
    const channelName = type === "direct" ? `dm-${Date.now()}` : name.trim();

    onCreate({
      name: channelName,
      type,
      description: description.trim(),
      memberIds: selectedMembers,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Nouveau canal</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setType("group")}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
                type === "group"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border hover:bg-muted text-muted-foreground",
              )}
            >
              <Hash className="h-4 w-4" />
              <div className="text-left">
                <p className="text-sm font-medium">Groupe</p>
                <p className="text-xs text-muted-foreground">
                  Visible par les membres
                </p>
              </div>
            </button>
            <button
              onClick={() => setType("direct")}
              className={cn(
                "flex flex-1 items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
                type === "direct"
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border hover:bg-muted text-muted-foreground",
              )}
            >
              <Lock className="h-4 w-4" />
              <div className="text-left">
                <p className="text-sm font-medium">Direct</p>
                <p className="text-xs text-muted-foreground">
                  Conversation privée
                </p>
              </div>
            </button>
          </div>

          {/* Name (only for group) */}
          {type === "group" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Nom du canal</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: équipe-closers"
                className="h-9"
              />
            </div>
          )}

          {/* Description (only for group) */}
          {type === "group" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optionnel)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="À quoi sert ce canal ?"
                className="h-9"
              />
            </div>
          )}

          {/* Members */}
          <div className="space-y-2">
            <Label className="text-xs">
              Membres ({selectedMembers.length} sélectionné
              {selectedMembers.length > 1 ? "s" : ""})
            </Label>

            {/* Selected members chips */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((id) => {
                  const p = profiles.find((pr) => pr.id === id);
                  if (!p) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                    >
                      {p.full_name}
                      <button
                        onClick={() => toggleMember(id)}
                        className="rounded-full p-0.5 hover:bg-primary/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Profile list */}
            <div className="max-h-48 overflow-y-auto rounded-lg border">
              {filteredProfiles.map((p) => {
                const isSelected = selectedMembers.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleMember(p.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                      isSelected ? "bg-primary/5" : "hover:bg-muted",
                    )}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {p.full_name ? getInitials(p.full_name) : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {p.full_name ?? "Sans nom"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {ROLE_LABELS[p.role] ?? p.role}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
              {filteredProfiles.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Aucun membre trouvé
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isCreating ||
              selectedMembers.length === 0 ||
              (type === "group" && !name.trim())
            }
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
