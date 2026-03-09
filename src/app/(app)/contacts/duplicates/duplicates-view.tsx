"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type DuplicateGroup,
  type DuplicateConfidence,
  type ContactRecord,
  mergeContacts,
} from "@/lib/actions/contacts";
import {
  Users,
  ChevronDown,
  ChevronRight,
  Merge,
  X,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DuplicatesViewProps {
  initialGroups: DuplicateGroup[];
  error: string | null;
}

const confidenceConfig: Record<
  DuplicateConfidence,
  { label: string; color: string; icon: React.ReactNode }
> = {
  high: {
    label: "Élevée",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  medium: {
    label: "Moyenne",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: <Info className="h-3 w-3" />,
  },
  low: {
    label: "Faible",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: <Info className="h-3 w-3" />,
  },
};

const MERGE_FIELDS = [
  { key: "first_name", label: "Prénom" },
  { key: "last_name", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "company", label: "Entreprise" },
  { key: "position", label: "Poste" },
  { key: "source", label: "Source" },
  { key: "status", label: "Statut" },
  { key: "notes", label: "Notes" },
] as const;

export function DuplicatesView({ initialGroups, error }: DuplicatesViewProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [fieldSelections, setFieldSelections] = useState<
    Record<string, Record<string, string>>
  >({});
  const [isPending, startTransition] = useTransition();

  const totalDuplicates = groups.length;
  const totalContacts = groups.reduce((sum, g) => sum + g.contacts.length, 0);

  function toggleGroup(groupId: string) {
    setExpandedGroup((prev) => (prev === groupId ? null : groupId));
  }

  function dismissGroup(groupId: string) {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    toast.success("Groupe ignoré");
  }

  function selectField(
    groupId: string,
    fieldKey: string,
    contactId: string
  ) {
    setFieldSelections((prev) => ({
      ...prev,
      [groupId]: {
        ...(prev[groupId] || {}),
        [fieldKey]: contactId,
      },
    }));
  }

  function getSelectedValue(
    groupId: string,
    fieldKey: string
  ): string | undefined {
    return fieldSelections[groupId]?.[fieldKey];
  }

  function handleMerge(group: DuplicateGroup) {
    const selections = fieldSelections[group.id] || {};
    // Default primary is the first (oldest) contact
    const primaryId = group.contacts[0].id;
    const secondaryIds = group.contacts
      .slice(1)
      .map((c) => c.id);

    startTransition(async () => {
      const result = await mergeContacts(primaryId, secondaryIds, selections);
      if (result.success) {
        setGroups((prev) => prev.filter((g) => g.id !== group.id));
        toast.success("Contacts fusionnés avec succès");
      } else {
        toast.error(result.error || "Erreur lors de la fusion");
      }
    });
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-[#14080e]/50 border-[#14080e]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#7af17a]/10">
                <Users className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDuplicates}</p>
                <p className="text-sm text-muted-foreground">
                  {totalDuplicates === 1
                    ? "doublon détecté"
                    : "doublons détectés"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#14080e]/50 border-[#14080e]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-[#7af17a]/10">
                <Merge className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalContacts}</p>
                <p className="text-sm text-muted-foreground">
                  contacts concernés
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-[#7af17a]" />
              <div>
                <p className="font-semibold text-lg">
                  Aucun doublon détecté
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Votre base de contacts est propre.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const config = confidenceConfig[group.confidence];

          return (
            <Card
              key={group.id}
              className="bg-card border overflow-hidden"
            >
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {group.contacts
                        .map(
                          (c) =>
                            [c.first_name, c.last_name]
                              .filter(Boolean)
                              .join(" ") || c.email || "Sans nom"
                        )
                        .join(" / ")}
                    </span>
                    <Badge
                      className={cn(
                        "text-xs border gap-1",
                        config.color
                      )}
                    >
                      {config.icon}
                      {config.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {group.reason}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.contacts.length} contacts
                  </span>
                </div>
              </button>

              {/* Expanded content: side-by-side comparison */}
              {isExpanded && (
                <div className="border-t px-4 py-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 text-muted-foreground font-medium min-w-[120px]">
                            Champ
                          </th>
                          {group.contacts.map((contact, idx) => (
                            <th
                              key={contact.id}
                              className="text-left py-2 px-2 font-medium min-w-[180px]"
                            >
                              <div className="flex items-center gap-2">
                                <span>
                                  Contact {idx + 1}
                                  {idx === 0 && (
                                    <span className="text-[#7af17a] ml-1 text-xs font-normal">
                                      (principal)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MERGE_FIELDS.map((field) => {
                          const values = group.contacts.map(
                            (c) =>
                              (
                                c as unknown as Record<
                                  string,
                                  string | null
                                >
                              )[field.key] || ""
                          );
                          const hasConflict =
                            new Set(
                              values.filter((v) => v !== "")
                            ).size > 1;

                          return (
                            <tr
                              key={field.key}
                              className={cn(
                                "border-b last:border-0",
                                hasConflict && "bg-amber-500/5"
                              )}
                            >
                              <td className="py-2 pr-4 text-muted-foreground">
                                {field.label}
                              </td>
                              {group.contacts.map((contact) => {
                                const val =
                                  (
                                    contact as unknown as Record<
                                      string,
                                      string | null
                                    >
                                  )[field.key] || "";
                                const isSelected =
                                  getSelectedValue(
                                    group.id,
                                    field.key
                                  ) === contact.id;
                                const nothingSelected =
                                  !getSelectedValue(
                                    group.id,
                                    field.key
                                  );

                                return (
                                  <td
                                    key={contact.id}
                                    className="py-2 px-2"
                                  >
                                    {val ? (
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                          type="radio"
                                          name={`${group.id}-${field.key}`}
                                          checked={
                                            isSelected ||
                                            (nothingSelected &&
                                              contact.id ===
                                                group
                                                  .contacts[0]
                                                  .id)
                                          }
                                          onChange={() =>
                                            selectField(
                                              group.id,
                                              field.key,
                                              contact.id
                                            )
                                          }
                                          className="accent-[#7af17a]"
                                        />
                                        <span
                                          className={cn(
                                            "group-hover:text-foreground transition-colors",
                                            isSelected ||
                                              (nothingSelected &&
                                                contact.id ===
                                                  group
                                                    .contacts[0]
                                                    .id)
                                              ? "text-foreground"
                                              : "text-muted-foreground"
                                          )}
                                        >
                                          {val}
                                        </span>
                                      </label>
                                    ) : (
                                      <span className="text-muted-foreground/50 italic">
                                        Vide
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      onClick={() => handleMerge(group)}
                      disabled={isPending}
                      size="sm"
                      className="bg-[#7af17a] text-[#14080e] hover:bg-[#7af17a]/90"
                    >
                      <Merge className="h-4 w-4" />
                      {isPending ? "Fusion en cours..." : "Fusionner"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dismissGroup(group.id)}
                      disabled={isPending}
                    >
                      <X className="h-4 w-4" />
                      Ignorer
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
