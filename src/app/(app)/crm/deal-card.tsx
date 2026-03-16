"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Deal } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Clock,
  Flame,
  Thermometer,
  Snowflake,
  Linkedin,
  Instagram,
  MessageCircle,
  Globe,
} from "lucide-react";

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  onClick?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

const TEMP_CONFIG = {
  hot: {
    icon: Flame,
    color: "text-foreground",
    bg: "bg-foreground/10",
    border: "border-foreground/20",
    label: "Hot",
  },
  warm: {
    icon: Thermometer,
    color: "text-muted-foreground",
    bg: "bg-muted/60",
    border: "border-border/50",
    label: "Warm",
  },
  cold: {
    icon: Snowflake,
    color: "text-muted-foreground/60",
    bg: "bg-muted/40",
    border: "border-border/30",
    label: "Cold",
  },
};

const AVATAR_COLORS = [
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
  "bg-zinc-600",
  "bg-zinc-700",
];

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const SOURCE_ICONS: Record<string, { icon: typeof Globe; color: string }> = {
  linkedin: { icon: Linkedin, color: "text-blue-400" },
  instagram: { icon: Instagram, color: "text-pink-400" },
  whatsapp: { icon: MessageCircle, color: "text-green-400" },
};

function getSourceIcon(source: string | null | undefined) {
  if (!source) return null;
  const key = source.toLowerCase();
  for (const [k, v] of Object.entries(SOURCE_ICONS)) {
    if (key.includes(k)) return v;
  }
  return null;
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 7) return `Il y a ${days}j`;
  if (days < 30) return `Il y a ${Math.floor(days / 7)}sem`;
  return `Il y a ${Math.floor(days / 30)}m`;
}

export function DealCard({
  deal,
  isDragging,
  onClick,
  selectionMode,
  isSelected,
  onSelectionChange,
}: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id, disabled: selectionMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const temp = TEMP_CONFIG[deal.temperature];
  const TempIcon = temp.icon;
  const dragging = isDragging || isSortableDragging;

  function handleCardClick(e: React.MouseEvent) {
    if (selectionMode) {
      e.stopPropagation();
      onSelectionChange?.(!isSelected);
      return;
    }
    onClick?.();
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...(selectionMode ? {} : { ...attributes, ...listeners })}
      className={cn(
        "transition-all duration-200 border-border/50 rounded-xl",
        selectionMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        "hover:shadow-md hover:border-border/80 hover:-translate-y-0.5",
        dragging &&
          "opacity-60 shadow-xl rotate-1 scale-105 border-brand/30 ring-1 ring-brand/10",
        isSelected && "ring-2 ring-brand/50 border-brand/40 bg-brand/5",
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-3.5">
        {/* Title + Temperature */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          {selectionMode && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) =>
                onSelectionChange?.(checked === true)
              }
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5 shrink-0"
            />
          )}
          <h4 className="text-[13px] font-semibold leading-tight line-clamp-2">
            {deal.title}
          </h4>
          <span
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded-md border",
              temp.color,
              temp.bg,
              temp.border,
            )}
          >
            <TempIcon className="h-2.5 w-2.5" />
            {temp.label}
          </span>
        </div>

        {/* Contact + Platform */}
        {deal.contact?.full_name && (
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className={cn(
                "h-5 w-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0",
                getAvatarColor(deal.contact.id || deal.contact.full_name),
              )}
            >
              {deal.contact.full_name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {deal.contact.full_name}
            </span>
            {(() => {
              const src = getSourceIcon(deal.source);
              if (!src) return null;
              const SrcIcon = src.icon;
              return <SrcIcon className={cn("h-3.5 w-3.5 shrink-0", src.color)} />;
            })()}
          </div>
        )}

        {/* Value + Probability + Assigned */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-brand" />
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
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-background",
                  getAvatarColor(
                    deal.assigned_user.id || deal.assigned_user.full_name,
                  ),
                )}
              >
                {deal.assigned_user.full_name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Next action + Last contact */}
        {(deal.next_action || deal.last_contact_at) && (
          <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1">
            {deal.next_action && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                <p className="text-[11px] text-muted-foreground truncate">
                  {deal.next_action}
                </p>
              </div>
            )}
            {deal.last_contact_at && (
              <p className="text-[10px] text-muted-foreground/50">
                Dernier contact : {formatRelativeDate(deal.last_contact_at)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
