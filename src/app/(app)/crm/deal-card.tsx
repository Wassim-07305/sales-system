"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import type { Deal } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { User, DollarSign, Clock, Flame, Thermometer, Snowflake } from "lucide-react";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onClick?: () => void;
}

const TEMP_CONFIG = {
  hot: {
    icon: Flame,
    color: "text-red-500",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Hot",
  },
  warm: {
    icon: Thermometer,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    label: "Warm",
  },
  cold: {
    icon: Snowflake,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Cold",
  },
};

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-amber-600", "bg-purple-600",
  "bg-pink-600", "bg-cyan-600", "bg-rose-600", "bg-indigo-600",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

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

  const temp = TEMP_CONFIG[deal.temperature];
  const TempIcon = temp.icon;
  const dragging = isDragging || isSortableDragging;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all border-border/50",
        "hover:shadow-md hover:border-border hover:-translate-y-0.5",
        dragging && "opacity-60 shadow-xl rotate-1 scale-105 border-brand/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3">
        {/* Title + Temperature */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <h4 className="text-[13px] font-semibold leading-tight line-clamp-2">
            {deal.title}
          </h4>
          <span
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md border",
              temp.color, temp.bg, temp.border,
            )}
          >
            <TempIcon className="h-2.5 w-2.5" />
            {temp.label}
          </span>
        </div>

        {/* Contact */}
        {deal.contact?.full_name && (
          <div className="flex items-center gap-2 mb-2.5">
            <div className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0",
              getAvatarColor(deal.contact.id || deal.contact.full_name),
            )}>
              {deal.contact.full_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground truncate">{deal.contact.full_name}</span>
          </div>
        )}

        {/* Value + Probability + Assigned */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-sm font-bold tabular-nums">
              {deal.value?.toLocaleString("fr-FR")} €
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {deal.probability != null && (
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                {deal.probability}%
              </span>
            )}
            {deal.assigned_user?.full_name && (
              <div className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-background",
                getAvatarColor(deal.assigned_user.id || deal.assigned_user.full_name),
              )}>
                {deal.assigned_user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Next action */}
        {deal.next_action && (
          <div className="mt-2.5 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
              <p className="text-[11px] text-muted-foreground truncate">{deal.next_action}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
