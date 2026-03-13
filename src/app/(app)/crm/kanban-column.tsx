"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { DealCard } from "./deal-card";
import type { Deal, PipelineStage } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  totalValue: number;
  onDealClick: (deal: Deal) => void;
}

export function KanbanColumn({
  stage,
  deals,
  totalValue,
  onDealClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1).replace(".0", "")}k €`;
    }
    return `${value} €`;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[75vw] sm:w-[260px] md:w-[280px] rounded-xl bg-muted/30 transition-colors snap-center",
        isOver && "bg-brand/5 ring-2 ring-brand/20"
      )}
    >
      {/* Column header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="text-sm font-semibold">{stage.name}</h3>
          </div>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {deals.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatValue(totalValue)}
        </p>
      </div>

      {/* Cards */}
      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 min-h-[100px] max-h-[calc(100dvh-340px)] md:max-h-[calc(100dvh-280px)] overflow-y-auto">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
            />
          ))}
          {deals.length === 0 && (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
              Aucun deal
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
