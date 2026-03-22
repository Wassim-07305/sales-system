"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealFilters } from "@/lib/actions/crm";

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
}

interface FilterPanelProps {
  filters: DealFilters;
  onFiltersChange: (filters: DealFilters) => void;
  sources: string[];
  teamMembers: TeamMember[];
  availableTags?: string[];
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  sources,
  teamMembers,
  availableTags = [],
  selectedTags = [],
  onToggleTag,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters =
    filters.dateFrom ||
    filters.dateTo ||
    (filters.amountMin && filters.amountMin > 0) ||
    (filters.amountMax && filters.amountMax > 0) ||
    (filters.assignedTo && filters.assignedTo !== "all") ||
    (filters.source && filters.source !== "all") ||
    (filters.sortBy && filters.sortBy !== "created_at_desc");

  function updateFilter<K extends keyof DealFilters>(
    key: K,
    value: DealFilters[K],
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  function resetFilters() {
    onFiltersChange({ sortBy: "created_at_desc" });
  }

  const activeCount = [
    filters.dateFrom || filters.dateTo,
    (filters.amountMin && filters.amountMin > 0) ||
      (filters.amountMax && filters.amountMax > 0),
    filters.assignedTo && filters.assignedTo !== "all",
    filters.source && filters.source !== "all",
  ].filter(Boolean).length;

  return (
    <div className="mb-4">
      {/* Toggle bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "gap-2 h-10 rounded-xl transition-colors",
            isOpen && "bg-muted",
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtres avancés
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black text-[10px] font-bold">
              {activeCount}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Sort - always visible */}
        <Select
          value={filters.sortBy || "created_at_desc"}
          onValueChange={(v) =>
            updateFilter("sortBy", v as DealFilters["sortBy"])
          }
        >
          <SelectTrigger className="w-[200px] h-10 rounded-xl text-xs">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at_desc">
              Date (récent → ancien)
            </SelectItem>
            <SelectItem value="created_at_asc">
              Date (ancien → récent)
            </SelectItem>
            <SelectItem value="value_desc">Montant (décroissant)</SelectItem>
            <SelectItem value="value_asc">Montant (croissant)</SelectItem>
            <SelectItem value="title_asc">Titre (A → Z)</SelectItem>
            <SelectItem value="title_desc">Titre (Z → A)</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="gap-1.5 text-muted-foreground h-9 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Collapsible panel */}
      {isOpen && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-2xl border border-border/50 bg-muted/20">
          {/* Date range */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Période de création
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) =>
                  updateFilter("dateFrom", e.target.value || undefined)
                }
                className="text-xs h-10 rounded-xl"
              />
              <Input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) =>
                  updateFilter("dateTo", e.target.value || undefined)
                }
                className="text-xs h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Amount range */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Montant (€)
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.amountMin || ""}
                onChange={(e) =>
                  updateFilter(
                    "amountMin",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="text-xs h-10 rounded-xl"
                min={0}
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.amountMax || ""}
                onChange={(e) =>
                  updateFilter(
                    "amountMax",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="text-xs h-10 rounded-xl"
                min={0}
              />
            </div>
          </div>

          {/* Assigned user */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Assigné à
            </Label>
            <Select
              value={filters.assignedTo || "all"}
              onValueChange={(v) => updateFilter("assignedTo", v)}
            >
              <SelectTrigger className="text-xs h-10 rounded-xl">
                <SelectValue placeholder="Tous les membres" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name || "Sans nom"} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Source
            </Label>
            <Select
              value={filters.source || "all"}
              onValueChange={(v) => updateFilter("source", v)}
            >
              <SelectTrigger className="text-xs h-10 rounded-xl">
                <SelectValue placeholder="Toutes les sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sources</SelectItem>
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          {availableTags.length > 0 && (
            <div className="space-y-2 sm:col-span-2 lg:col-span-4">
              <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Tags contact
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-[11px] transition-colors",
                      selectedTags.includes(tag)
                        ? "bg-emerald-500 text-black hover:bg-emerald-400"
                        : "hover:bg-muted",
                    )}
                    onClick={() => onToggleTag?.(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
