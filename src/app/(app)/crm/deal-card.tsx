"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { User, DollarSign } from "lucide-react";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onClick?: () => void;
}

const tempColors = {
  hot: "bg-red-100 text-red-700 border-red-200",
  warm: "bg-orange-100 text-orange-700 border-orange-200",
  cold: "bg-blue-100 text-blue-700 border-blue-200",
};

const tempLabels = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

export function DealCard({ deal, isDragging, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md",
        (isDragging || isSortableDragging) && "opacity-50 shadow-lg rotate-1"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-medium leading-tight line-clamp-2">
            {deal.title}
          </h4>
          <Badge
            variant="outline"
            className={cn("text-[10px] shrink-0", tempColors[deal.temperature])}
          >
            {tempLabels[deal.temperature]}
          </Badge>
        </div>

        {deal.contact?.full_name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <User className="h-3 w-3" />
            <span>{deal.contact.full_name}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <DollarSign className="h-3.5 w-3.5 text-brand" />
            <span>{deal.value?.toLocaleString("fr-FR")} €</span>
          </div>
          {deal.assigned_user?.full_name && (
            <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center text-brand text-[10px] font-bold">
              {deal.assigned_user.full_name.charAt(0)}
            </div>
          )}
        </div>

        {deal.next_action && (
          <p className="text-[11px] text-muted-foreground mt-2 truncate">
            {deal.next_action}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
