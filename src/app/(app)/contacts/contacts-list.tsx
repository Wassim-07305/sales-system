"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Profile, UserRole } from "@/lib/types/database";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Mail,
  Phone,
  Download,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ExternalLink,
  Plus,
  X,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { ImportExportDialog } from "./import-export-dialog";
import { ExportDialog } from "@/components/export-dialog";
import { addContactTag, removeContactTag } from "@/lib/actions/contacts";
import { cn } from "@/lib/utils";

interface ContactsListProps {
  initialContacts: Profile[];
}

const ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  admin: {
    label: "Admin",
    color: "bg-foreground/10 text-foreground border-foreground/20",
  },
  manager: {
    label: "Manager",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  setter: {
    label: "Setter",
    color: "bg-muted/60 text-muted-foreground border-border/50",
  },
  closer: {
    label: "Closer",
    color: "bg-muted/60 text-muted-foreground border-border/50",
  },
  client_b2b: {
    label: "Client B2B",
    color: "bg-muted/40 text-muted-foreground/80 border-border/30",
  },
  client_b2c: {
    label: "Client B2C",
    color: "bg-muted/40 text-muted-foreground/80 border-border/30",
  },
  csm: {
    label: "CSM",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
};

const AVATAR_COLORS = [
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const PAGE_SIZE = 25;

type SortKey = "name" | "email" | "role" | "company" | "health";
type SortDir = "asc" | "desc";

// Tag colors (cycling through them for visual variety)
const TAG_COLORS = [
  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "bg-rose-500/10 text-rose-400 border-rose-500/20",
  "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++)
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

function ContactTagManager({
  contact,
  onTagsChanged,
}: {
  contact: Profile;
  onTagsChanged: (contactId: string, tags: string[]) => void;
}) {
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const tags: string[] = Array.isArray(contact.tags) ? contact.tags : [];

  async function handleAddTag() {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed) return;
    setIsAdding(true);
    const result = await addContactTag(contact.id, trimmed);
    if (result.error) {
      toast.error(result.error);
    } else if (result.tags) {
      onTagsChanged(contact.id, result.tags);
      toast.success(`Tag "${trimmed}" ajouté`);
    }
    setNewTag("");
    setIsAdding(false);
  }

  async function handleRemoveTag(tag: string) {
    const result = await removeContactTag(contact.id, tag);
    if (result.error) {
      toast.error(result.error);
    } else if (result.tags) {
      onTagsChanged(contact.id, result.tags);
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-5 gap-0.5 font-medium border",
            getTagColor(tag),
          )}
        >
          {tag}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveTag(tag);
            }}
            className="ml-0.5 hover:opacity-70"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="h-5 w-5 rounded-md border border-dashed border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors"
            title="Ajouter un tag"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium">Ajouter un tag</p>
            <div className="flex gap-1.5">
              <Input
                placeholder="Nouveau tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="h-8 text-xs"
                disabled={isAdding}
              />
              <Button
                size="sm"
                className="h-8 px-2.5"
                onClick={handleAddTag}
                disabled={isAdding || !newTag.trim()}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ContactsList({ initialContacts }: ContactsListProps) {
  const [contacts, setContacts] = useState<Profile[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Collect all unique tags across contacts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    contacts.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [contacts]);

  function handleTagsChanged(contactId: string, newTags: string[]) {
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, tags: newTags } : c)),
    );
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  const filtered = useMemo(() => {
    const result = contacts.filter((c) => {
      const matchesSearch =
        !search ||
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.company?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || c.role === roleFilter;
      const matchesTag =
        tagFilter === "all" ||
        (Array.isArray(c.tags) && c.tags.includes(tagFilter));
      return matchesSearch && matchesRole && matchesTag;
    });

    result.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return (a.full_name || "").localeCompare(b.full_name || "") * dir;
        case "email":
          return a.email.localeCompare(b.email) * dir;
        case "role":
          return a.role.localeCompare(b.role) * dir;
        case "company":
          return (a.company || "").localeCompare(b.company || "") * dir;
        case "health":
          return ((a.health_score || 0) - (b.health_score || 0)) * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, search, roleFilter, tagFilter, sortKey, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach((c) => {
      counts[c.role] = (counts[c.role] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  const renderSortHeader = (label: string, sortId: SortKey) => {
    const active = sortKey === sortId;
    return (
      <button
        onClick={() => handleSort(sortId)}
        className={cn(
          "flex items-center gap-1 text-xs font-medium uppercase tracking-wider transition-colors",
          active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
        <ArrowUpDown className={cn("h-3 w-3", active && "text-emerald-500")} />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="font-semibold text-foreground">
            {contacts.length}
          </span>{" "}
          contacts
        </div>
        <div className="h-4 w-px bg-border" />
        {Object.entries(roleCounts)
          .slice(0, 4)
          .map(([role, count]) => {
            const config = ROLE_CONFIG[role as UserRole];
            return (
              <button
                key={role}
                onClick={() =>
                  setRoleFilter(roleFilter === role ? "all" : role)
                }
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-md font-medium border transition-colors",
                  roleFilter === role
                    ? config?.color || "bg-muted"
                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50",
                )}
              >
                {config?.label || role} · {count}
              </button>
            );
          })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, email, entreprise..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            setRoleFilter(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-[160px] h-11 rounded-xl">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="client_b2b">Client B2B</SelectItem>
            <SelectItem value="client_b2c">Client B2C</SelectItem>
            <SelectItem value="setter">Setter</SelectItem>
            <SelectItem value="closer">Closer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select
            value={tagFilter}
            onValueChange={(v) => {
              setTagFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[160px] h-11 rounded-xl">
              <Tag className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-2 ml-auto">
          <ImportExportDialog />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportOpen(true)}
            className="h-9"
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Export
          </Button>
        </div>
        <ExportDialog
          type="contacts"
          open={exportOpen}
          onOpenChange={setExportOpen}
        />
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-xl border-border/50 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">
                    {renderSortHeader("Contact", "name")}
                  </TableHead>
                  <TableHead>{renderSortHeader("Email", "email")}</TableHead>
                  <TableHead className="w-[120px]">
                    {renderSortHeader("Rôle", "role")}
                  </TableHead>
                  <TableHead className="w-[200px]">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tags
                    </span>
                  </TableHead>
                  <TableHead>
                    {renderSortHeader("Entreprise", "company")}
                  </TableHead>
                  <TableHead className="w-[100px]">
                    {renderSortHeader("Santé", "health")}
                  </TableHead>
                  <TableHead className="text-right w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((contact) => {
                  const roleConfig = ROLE_CONFIG[contact.role];
                  const healthScore = contact.health_score || 0;
                  const healthColor =
                    healthScore >= 70
                      ? "text-emerald-500"
                      : healthScore >= 40
                        ? "text-muted-foreground"
                        : "text-muted-foreground/60";
                  const healthBg =
                    healthScore >= 70
                      ? "bg-emerald-500"
                      : healthScore >= 40
                        ? "bg-muted-foreground"
                        : "bg-muted-foreground/40";

                  return (
                    <TableRow
                      key={contact.id}
                      className="group hover:bg-secondary/50 transition-colors"
                    >
                      <TableCell>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="flex items-center gap-3 group/link"
                        >
                          <div
                            className={cn(
                              "h-9 w-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 transition-transform group-hover/link:scale-105",
                              getAvatarColor(contact.id),
                            )}
                          >
                            {contact.full_name
                              ?.split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate group-hover/link:text-emerald-500 transition-colors">
                              {contact.full_name || "Sans nom"}
                            </p>
                            {contact.phone && (
                              <p className="text-[11px] text-muted-foreground/60 truncate">
                                {contact.phone}
                              </p>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {contact.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-[11px] px-2 py-0.5 rounded-md font-medium border inline-block",
                            roleConfig?.color ||
                              "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {roleConfig?.label || contact.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ContactTagManager
                          contact={contact}
                          onTagsChanged={handleTagsChanged}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {contact.company || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", healthBg)}
                              style={{ width: `${healthScore}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-xs font-semibold tabular-nums",
                              healthColor,
                            )}
                          >
                            {healthScore}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.preventDefault();
                              if (contact.email) {
                                window.open(
                                  `mailto:${contact.email}`,
                                  "_blank",
                                );
                              } else {
                                toast.error("Aucune adresse email");
                              }
                            }}
                            title="Envoyer un email"
                          >
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.preventDefault();
                              if (contact.phone) {
                                window.open(`tel:${contact.phone}`, "_self");
                              } else {
                                toast.error("Aucun numéro de téléphone");
                              }
                            }}
                            title="Appeler"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                          <Link href={`/contacts/${contact.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Voir le profil"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                          <Search className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                        <p className="font-medium text-sm">
                          Aucun contact trouvé
                        </p>
                        <p className="text-xs text-muted-foreground max-w-xs">
                          {search
                            ? "Essayez avec d'autres termes de recherche"
                            : "Ajoutez votre premier contact ou importez un fichier CSV"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, filtered.length)} sur{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum =
                    totalPages <= 5
                      ? i
                      : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "h-7 w-7 text-xs",
                        pageNum === page && "bg-emerald-500 text-black",
                      )}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
