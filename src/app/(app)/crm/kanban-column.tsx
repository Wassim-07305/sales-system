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
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M €`;
    if (value >= 1000) return `${(value / 1000).toFixed(1).replace(".0", "")}k €`;
    return `${value.toLocaleString("fr-FR")} €`;
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[75vw] sm:w-[260px] md:w-[280px] rounded-2xl transition-all duration-200 snap-center",
        "bg-muted/20 border border-border/50 shadow-sm",
        isOver && "bg-brand/5 border-brand/30 ring-2 ring-brand/20 scale-[1.01] shadow-md"
      )}
    >
      {/* Column header */}
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2.5">
            <div
              className="h-3 w-3 rounded-full ring-2 ring-offset-1 ring-offset-background"
              style={{ backgroundColor: stage.color, boxShadow: `0 0 8px ${stage.color}40` }}
            />
            <h3 className="text-[13px] font-semibold tracking-tight">{stage.name}</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted/80 rounded-full min-w-[24px] text-center px-2 py-0.5">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">{formatValue(totalValue)}</p>
          {deals.length > 0 && (
            <div className="flex-1 h-1 bg-muted/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ backgroundColor: stage.color, width: "100%", opacity: 0.6 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="mx-3.5 h-px bg-border/40" />

      {/* Cards */}
      <SortableContext
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 min-h-[80px] max-h-[calc(100dvh-340px)] md:max-h-[calc(100dvh-280px)] overflow-y-auto scrollbar-hide">
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
            />
          ))}
          {deals.length === 0 && (
            <div className="flex flex-col items-center justify-center h-20 text-center">
              <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center mb-1.5">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/20" />
              </div>
              <p className="text-[11px] text-muted-foreground/60">Aucun deal</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
