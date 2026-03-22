"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  Share2,
  Play,
  Presentation,
  Loader2,
} from "lucide-react";
import type { Presentation as PresentationType } from "@/lib/types/database";
import {
  deletePresentation,
  duplicatePresentation,
} from "@/lib/actions/genspark";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface PresentationCardProps {
  presentation: PresentationType;
  onShare?: (id: string) => void;
}

const themeColors: Record<string, string> = {
  dark: "bg-[#09090b]",
  light: "bg-gray-100",
  brand: "bg-gradient-to-br from-[#09090b] to-[#1a0f14]",
};

export function PresentationCard({
  presentation,
  onShare,
}: PresentationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);

  function handleDuplicate() {
    startTransition(async () => {
      try {
        await duplicatePresentation(presentation.id);
        toast.success("Présentation dupliquée");
      } catch {
        toast.error("Erreur lors de la duplication");
      }
    });
  }

  function handleDelete() {
    setIsDeleting(true);
    startTransition(async () => {
      try {
        await deletePresentation(presentation.id);
        toast.success("Présentation supprimée");
      } catch {
        toast.error("Erreur lors de la suppression");
      } finally {
        setIsDeleting(false);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-border/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group">
      {/* Miniature */}
      <div
        className={`relative h-36 rounded-t-2xl ${themeColors[presentation.theme] || themeColors.dark} flex items-center justify-center overflow-hidden`}
      >
        <div className="text-center px-4">
          <Presentation className="h-8 w-8 mx-auto mb-2 text-emerald-500/40" />
          <p className="text-xs text-white/50 font-medium truncate max-w-[200px]">
            {presentation.title}
          </p>
        </div>
        {/* Overlay actions on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link href={`/genspark/${presentation.id}`}>
            <Button size="sm" variant="secondary" className="h-8 text-xs">
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Éditer
            </Button>
          </Link>
          <Link href={`/genspark/${presentation.id}/present`}>
            <Button
              size="sm"
              className="h-8 text-xs bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <Play className="h-3.5 w-3.5 mr-1" />
              Présenter
            </Button>
          </Link>
        </div>
      </div>

      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold line-clamp-1">
            {presentation.title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-3.5 w-3.5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/genspark/${presentation.id}`}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Modifier
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/genspark/${presentation.id}/present`}>
                  <Play className="h-3.5 w-3.5 mr-2" />
                  Présenter
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Dupliquer
              </DropdownMenuItem>
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(presentation.id)}>
                  <Share2 className="h-3.5 w-3.5 mr-2" />
                  Partager
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[10px] bg-muted/40 border-border/50"
            >
              {presentation.slide_count} slide
              {presentation.slide_count !== 1 ? "s" : ""}
            </Badge>
            <Badge
              variant="outline"
              className="text-[10px] capitalize bg-muted/40 border-border/50"
            >
              {presentation.theme}
            </Badge>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(presentation.updated_at), "d MMM yyyy", {
              locale: fr,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
