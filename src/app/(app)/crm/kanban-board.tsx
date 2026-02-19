"use client";

import { useState, useCallback } from "react";
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
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { DealCard } from "./deal-card";
import { NewDealDialog } from "./new-deal-dialog";
import { DealPanel } from "./deal-panel";
import { createClient } from "@/lib/supabase/client";
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
import { Search, Filter } from "lucide-react";

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

    // Persist
    const supabase = createClient();
    const { error } = await supabase
      .from("deals")
      .update({ stage_id: newStageId, updated_at: new Date().toISOString() })
      .eq("id", dealId);

    if (error) {
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
      {/* Filters */}
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
      </div>

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
