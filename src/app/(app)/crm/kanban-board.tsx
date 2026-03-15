"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
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
import { Search, Filter, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getFilteredDeals, getDealSources, getTeamMembers, updateDealStage, type DealFilters } from "@/lib/actions/crm";

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

export function KanbanBoard({ initialStages, initialDeals, readOnly = false, setterFilter }: KanbanBoardProps) {
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
  const [tempFilter, setTempFilter] = useState<string>("all");
  const [selectedSetter, setSelectedSetter] = useState<string>("all");

  // Advanced filters
  const [advancedFilters, setAdvancedFilters] = useState<DealFilters>({ sortBy: "created_at_desc" });
  const [sources, setSources] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [, startTransition] = useTransition();

  // Load sources and team members on mount
  useEffect(() => {
    getDealSources().then(setSources);
    getTeamMembers().then(setTeamMembers);
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
    })
  );

  // Custom collision detection: prefer columns (stages) over deal cards
  const stageIdSet = new Set(stages.map((s) => s.id));
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    // First try pointerWithin — most natural for columns
    const pointerCollisions = pointerWithin(args);
    const columnHit = pointerCollisions.find((c) => stageIdSet.has(c.id as string));
    if (columnHit) return [columnHit];

    // Fallback to closestCorners
    const cornerCollisions = closestCorners(args);
    const columnCornerHit = cornerCollisions.find((c) => stageIdSet.has(c.id as string));
    if (columnCornerHit) return [columnCornerHit];

    // Last resort: return whatever we found
    return cornerCollisions;
  }, [stageIdSet]);

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      !searchQuery ||
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.contact?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTemp = tempFilter === "all" || deal.temperature === tempFilter;
    const matchesSetter =
      selectedSetter === "all" || deal.assigned_to === selectedSetter;
    return matchesSearch && matchesTemp && matchesSetter;
  });

  const getDealsForStage = useCallback(
    (stageId: string) => filteredDeals.filter((d) => d.stage_id === stageId),
    [filteredDeals]
  );

  const getStageValue = useCallback(
    (stageId: string) =>
      getDealsForStage(stageId).reduce((sum, d) => sum + (d.value || 0), 0),
    [getDealsForStage]
  );

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal || null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDeal(null);

    if (readOnly) return;
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
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d))
    );

    // Persist via server action
    const result = await updateDealStage(dealId, newStageId);

    if (result.error) {
      console.error("[CRM] Erreur déplacement deal:", result.error);
      toast.error("Erreur : " + result.error);
      setDeals((prev) =>
        prev.map((d) =>
          d.id === dealId ? { ...d, stage_id: deal.stage_id } : d
        )
      );
    }
  }

  function handleDealCreated(newDeal: Deal) {
    setDeals((prev) => [newDeal, ...prev]);
  }

  return (
    <>
      {/* Advanced Filters */}
      <FilterPanel
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        sources={sources}
        teamMembers={teamMembers}
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
            <SelectItem value="hot">🔥 Hot</SelectItem>
            <SelectItem value="warm">🌡️ Warm</SelectItem>
            <SelectItem value="cold">❄️ Cold</SelectItem>
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
          <div className="ml-auto">
            <NewDealDialog stages={stages} onDealCreated={handleDealCreated} />
          </div>
        )}
      </div>

      {/* Empty state: zero deals */}
      {deals.length === 0 && (
        <Card className="mb-6 border-border/50 bg-muted/10">
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-7 w-7 text-brand" />
            </div>
            <p className="font-semibold text-lg">Votre pipeline est vide</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Créez votre premier deal pour commencer à suivre vos opportunités commerciales.
            </p>
            <div className="mt-5">
              <NewDealDialog stages={stages} onDealCreated={handleDealCreated} />
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
          <p className="text-sm font-medium">Aucun deal ne correspond aux filtres</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => { setSearchQuery(""); setTempFilter("all"); }}
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
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
            setSelectedDeal(updated);
          }}
        />
      )}
    </>
  );
}
