"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
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

interface KanbanBoardProps {
  initialStages: PipelineStage[];
  initialDeals: Deal[];
}

export function KanbanBoard({ initialStages, initialDeals }: KanbanBoardProps) {
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

  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      !searchQuery ||
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.contact?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTemp = tempFilter === "all" || deal.temperature === tempFilter;
    return matchesSearch && matchesTemp;
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

    if (!over) return;

    const dealId = active.id as string;
    const newStageId = over.id as string;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage_id === newStageId) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d))
    );

    // Persist via server action
    const result = await updateDealStage(dealId, newStageId);

    if (result.error) {
      toast.error("Erreur lors du déplacement du deal");
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
            placeholder="Rechercher un deal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tempFilter} onValueChange={setTempFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Température" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
          </SelectContent>
        </Select>
        <NewDealDialog stages={stages} onDealCreated={handleDealCreated} />
      </div>

      {/* Empty state: zero deals */}
      {deals.length === 0 && (
        <Card className="mb-6 border-brand/20 bg-brand/5">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-brand/50 mb-3" />
            <p className="font-medium text-lg">Votre pipeline est vide</p>
            <p className="text-sm text-muted-foreground mt-1">
              Créez votre premier deal pour commencer à suivre vos opportunités.
            </p>
            <NewDealDialog stages={stages} onDealCreated={handleDealCreated} />
          </CardContent>
        </Card>
      )}

      {/* No results message */}
      {filteredDeals.length === 0 && deals.length > 0 && (
        <div className="text-center py-8 mb-4">
          <p className="text-muted-foreground">Aucun deal ne correspond aux filtres actuels.</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => { setSearchQuery(""); setTempFilter("all"); }}
            className="text-brand"
          >
            Réinitialiser les filtres
          </Button>
        </div>
      )}

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
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
