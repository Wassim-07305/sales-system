"use client";

import { useState, useCallback, useEffect, useTransition, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { KanbanColumn } from "./kanban-column";
import { DealCard } from "./deal-card";
import { NewDealDialog } from "./new-deal-dialog";
import { DealPanel } from "./deal-panel";
import { FilterPanel } from "./filter-panel";
import { PipelineStats } from "./pipeline-stats";
import { toast } from "sonner";
import type { Deal, PipelineStage } from "@/lib/types/database";
import { PIPELINE_DEFAULT_STAGES } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  BarChart3,
  CheckSquare,
  X,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getFilteredDeals,
  getDealSources,
  getTeamMembers,
  getContactTags,
  updateDealStage,
  bulkMoveDeals,
  type DealFilters,
} from "@/lib/actions/crm";

interface TeamMember {
  id: string;
  full_name: string | null;
  role: string;
}

interface SetterInfo {
  id: string;
  full_name: string | null;
}

interface KanbanBoardProps {
  initialStages: PipelineStage[];
  initialDeals: Deal[];
  readOnly?: boolean;
  setterFilter?: SetterInfo[];
}

export function KanbanBoard({
  initialStages,
  initialDeals,
  readOnly = false,
  setterFilter,
}: KanbanBoardProps) {
  const stages =
    initialStages.length > 0
      ? initialStages
      : PIPELINE_DEFAULT_STAGES.map((s, i) => ({
          id: `default-${i}`,
          ...s,
          created_at: new Date().toISOString(),
        }));

  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [selectedSetter, setSelectedSetter] = useState<string>("all");

  // Selection mode (bulk actions)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<DealFilters>({
    sortBy: "created_at_desc",
  });
  const [sources, setSources] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Load sources, team members, and tags on mount
  useEffect(() => {
    getDealSources().then(setSources);
    getTeamMembers().then(setTeamMembers);
    getContactTags().then(setAvailableTags);
  }, []);

  // Apply advanced filters via server action
  useEffect(() => {
    const hasAdvancedFilters =
      advancedFilters.dateFrom ||
      advancedFilters.dateTo ||
      (advancedFilters.amountMin && advancedFilters.amountMin > 0) ||
      (advancedFilters.amountMax && advancedFilters.amountMax > 0) ||
      (advancedFilters.assignedTo && advancedFilters.assignedTo !== "all") ||
      (advancedFilters.source && advancedFilters.source !== "all") ||
      (advancedFilters.sortBy && advancedFilters.sortBy !== "created_at_desc");

    if (!hasAdvancedFilters) {
      startTransition(() => {
        setDeals(initialDeals);
      });
      return;
    }

    startTransition(async () => {
      const result = await getFilteredDeals(advancedFilters);
      if (result.error) {
        toast.error("Erreur lors du filtrage des deals");
        return;
      }
      setDeals(result.deals as Deal[]);
    });
  }, [advancedFilters, initialDeals]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Custom collision detection: prefer columns (stages) over deal cards
  const stageIdSet = useMemo(() => new Set(stages.map((s) => s.id)), [stages]);
  const customCollisionDetection: CollisionDetection = useCallback(
    (args) => {
      // First try pointerWithin — most natural for columns
      const pointerCollisions = pointerWithin(args);
      const columnHit = pointerCollisions.find((c) =>
        stageIdSet.has(c.id as string),
      );
      if (columnHit) return [columnHit];

      // Fallback to closestCorners
      const cornerCollisions = closestCorners(args);
      const columnCornerHit = cornerCollisions.find((c) =>
        stageIdSet.has(c.id as string),
      );
      if (columnCornerHit) return [columnCornerHit];

      // Last resort: return whatever we found
      return cornerCollisions;
    },
    [stageIdSet],
  );

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      !debouncedSearch ||
      deal.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      deal.contact?.full_name
        ?.toLowerCase()
        .includes(debouncedSearch.toLowerCase());
    const matchesTemp = tempFilter === "all" || deal.temperature === tempFilter;
    const matchesSetter =
      selectedSetter === "all" || deal.assigned_to === selectedSetter;
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every(
        (tag) =>
          (Array.isArray(deal.tags) && deal.tags.includes(tag)) ||
          (Array.isArray(deal.contact?.tags) &&
            deal.contact.tags.includes(tag)),
      );
    return matchesSearch && matchesTemp && matchesSetter && matchesTags;
  });

  const getDealsForStage = useCallback(
    (stageId: string) => filteredDeals.filter((d) => d.stage_id === stageId),
    [filteredDeals],
  );

  const getStageValue = useCallback(
    (stageId: string) =>
      getDealsForStage(stageId).reduce((sum, d) => sum + (d.value || 0), 0),
    [getDealsForStage],
  );

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);

    if (readOnly) {
      toast.info("Mode lecture seule — vous ne pouvez pas déplacer les deals");
      return;
    }
    if (!over) return;

    const dealId = active.id as string;
    const overId = over.id as string;

    // over.id could be a stage ID (dropped on column) or a deal ID (dropped on a card).
    // Resolve the target stage ID.
    const stageIds = new Set(stages.map((s) => s.id));
    const resolvedStageId = stageIds.has(overId)
      ? overId
      : deals.find((d) => d.id === overId)?.stage_id;

    if (!resolvedStageId) return;

    const deal = deals.find((d) => d.id === dealId);
    const newStageId = resolvedStageId;
    if (!deal || deal.stage_id === newStageId) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
    );

    // Persist via server action
    const result = await updateDealStage(dealId, newStageId);

    if (result.error) {
      console.error("[CRM] Erreur déplacement deal:", result.error);
      toast.error("Erreur : " + result.error);
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stage_id: deal.stage_id } : d,
        ),
      );
    }
  }

  function handleDealCreated(newDeal: Deal) {
    setDeals((prev) => [newDeal, ...prev]);
  }

  function handleDealSelectionChange(dealId: string, selected: boolean) {
    setSelectedDealIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(dealId);
      } else {
        next.delete(dealId);
      }
      return next;
    });
  }

  function toggleSelectionMode() {
    if (selectionMode) {
      setSelectedDealIds(new Set());
    }
    setSelectionMode(!selectionMode);
  }

  async function handleBulkMove(targetStageId: string) {
    const ids = Array.from(selectedDealIds);
    if (ids.length === 0) return;

    setIsBulkMoving(true);

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) =>
        selectedDealIds.has(d.id) ? { ...d, stage_id: targetStageId } : d,
      ),
    );

    const result = await bulkMoveDeals(ids, targetStageId);

    if (result.error) {
      toast.error("Erreur : " + result.error);
      // Revert would be complex, just reload
      const refreshed = await getFilteredDeals(advancedFilters);
      if (refreshed.deals) setDeals(refreshed.deals as Deal[]);
    } else {
      toast.success(`${ids.length} deal(s) déplacé(s) avec succès`);
      setSelectedDealIds(new Set());
      setSelectionMode(false);
    }

    setIsBulkMoving(false);
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <>
      {/* Advanced Filters */}
      <FilterPanel
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        sources={sources}
        teamMembers={teamMembers}
        availableTags={availableTags}
        selectedTags={selectedTags}
        onToggleTag={toggleTag}
      />

      {/* Pipeline Stats */}
      <PipelineStats deals={filteredDeals} />

      {/* Search & Temperature Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un deal ou contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-xl"
          />
        </div>
        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-[160px] h-11 rounded-xl">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Température" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="hot">🔥 Chaud</SelectItem>
            <SelectItem value="warm">🌡️ Tiède</SelectItem>
            <SelectItem value="cold">❄️ Froid</SelectItem>
          </SelectContent>
        </Select>
        {setterFilter && setterFilter.length > 0 && (
          <Select value={selectedSetter} onValueChange={setSelectedSetter}>
            <SelectTrigger className="w-[200px] h-11 rounded-xl">
              <SelectValue placeholder="Filtrer par setter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les setters</SelectItem>
              {setterFilter.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name || "Setter sans nom"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {!readOnly && (
          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={toggleSelectionMode}
              className={cn(
                "gap-2 h-11 rounded-xl",
                selectionMode && "bg-brand text-brand-dark hover:bg-brand/90",
              )}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectionMode ? "Annuler" : "Sélection"}
            </Button>
            <NewDealDialog stages={stages} onDealCreated={handleDealCreated} />
          </div>
        )}
      </div>

      {/* Tag filter */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground mr-1">
            Tags :
          </span>
          {availableTags.map((tag) => (
            <Badge
              key={tag}
              variant={selectedTags.includes(tag) ? "default" : "outline"}
              className={cn(
                "cursor-pointer text-[11px] transition-colors",
                selectedTags.includes(tag)
                  ? "bg-brand text-brand-dark hover:bg-brand/90"
                  : "hover:bg-muted",
              )}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </Badge>
          ))}
          {selectedTags.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTags([])}
              className="h-6 px-2 text-[11px] text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      )}

      {/* Empty state: zero deals */}
      {deals.length === 0 && (
        <Card className="mb-6 border-border/50 bg-muted/10">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-7 w-7 text-brand" />
            </div>
            <p className="font-semibold text-lg">Votre pipeline est vide</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Créez votre premier deal pour commencer à suivre vos opportunités
              commerciales.
            </p>
            <div className="mt-5">
              <NewDealDialog
                stages={stages}
                onDealCreated={handleDealCreated}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {filteredDeals.length === 0 && deals.length > 0 && (
        <div className="text-center py-12 mb-4">
          <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Search className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium">
            Aucun deal ne correspond aux filtres
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setTempFilter("all");
            }}
            className="text-brand mt-1"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={customCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-2 md:px-2 scrollbar-hide snap-x snap-mandatory md:snap-none">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={getDealsForStage(stage.id)}
              totalValue={getStageValue(stage.id)}
              onDealClick={setSelectedDeal}
              selectionMode={selectionMode}
              selectedDealIds={selectedDealIds}
              onDealSelectionChange={handleDealSelectionChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && <DealCard deal={activeDeal} isDragging />}
        </DragOverlay>
      </DndContext>

      {/* Deal Panel */}
      {selectedDeal && (
        <DealPanel
          deal={selectedDeal}
          stages={stages}
          onClose={() => setSelectedDeal(null)}
          onUpdate={(updated) => {
            setDeals((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d)),
            );
            setSelectedDeal(updated);
          }}
        />
      )}

      {/* Bulk actions floating bar */}
      {selectionMode && selectedDealIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background/95 backdrop-blur-sm border border-border/80 shadow-2xl rounded-2xl px-5 py-3">
          <span className="text-sm font-semibold tabular-nums">
            {selectedDealIds.size} sélectionné
            {selectedDealIds.size > 1 ? "s" : ""}
          </span>
          <div className="h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDealIds(new Set())}
            className="text-muted-foreground text-xs h-8"
          >
            <X className="h-3 w-3 mr-1" />
            Tout désélectionner
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">
              Déplacer vers
            </span>
            {stages.map((stage) => (
              <Button
                key={stage.id}
                variant="outline"
                size="sm"
                disabled={isBulkMoving}
                onClick={() => handleBulkMove(stage.id)}
                className="h-8 text-xs rounded-lg gap-1.5"
              >
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                {stage.name}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
