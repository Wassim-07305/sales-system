"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  Users,
  Settings2,
} from "lucide-react";
import type { BookingPage } from "@/lib/types/database";
import {
  deleteBookingPage,
  updateBookingPage,
} from "@/lib/actions/booking-pages";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BookingPageFormModal } from "./booking-page-form-modal";
import { AvailabilityEditor } from "./availability-editor";
import { cn } from "@/lib/utils";

interface BookingPageCardProps {
  page: BookingPage;
}

export function BookingPageCard({ page }: BookingPageCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);

  function handleCopyUrl() {
    const url = `${window.location.origin}/book/${page.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copiée !");
  }

  function handleToggleActive() {
    startTransition(async () => {
      const result = await updateBookingPage(page.id, {
        is_active: !page.is_active,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(page.is_active ? "Page désactivée" : "Page activée");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer cette page de booking ?")) return;
    startTransition(async () => {
      const result = await deleteBookingPage(page.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Page supprimée");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Card className="group rounded-xl border-border/40 shadow-sm transition-all hover:shadow-md">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl"
                style={{ backgroundColor: page.brand_color + "20" }}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-xl text-sm font-bold"
                  style={{ color: page.brand_color }}
                >
                  {page.title.charAt(0).toUpperCase()}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{page.title}</h3>
                <p className="text-xs text-muted-foreground">
                  /book/{page.slug}
                </p>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowEdit(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAvailability(true)}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Disponibilités
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier l&apos;URL
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a
                    href={`/book/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ouvrir
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleActive}>
                  {page.is_active ? "Désactiver" : "Activer"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {page.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {page.description}
            </p>
          )}

          {/* Meta */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full text-xs",
                page.is_active
                  ? "border-brand/20 bg-brand/10 text-brand"
                  : "border-border/50 bg-muted/40 text-muted-foreground",
              )}
            >
              {page.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-full border-border/50 text-xs text-muted-foreground"
            >
              <Clock className="mr-1 h-3 w-3" />
              {page.slot_duration} min
            </Badge>
            {page.qualification_fields &&
              page.qualification_fields.length > 0 && (
                <Badge
                  variant="outline"
                  className="rounded-full border-border/50 text-xs text-muted-foreground"
                >
                  {page.qualification_fields.length} champs
                </Badge>
              )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleCopyUrl}
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copier l&apos;URL
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setShowAvailability(true)}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Disponibilités
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <BookingPageFormModal
        open={showEdit}
        onOpenChange={setShowEdit}
        page={page}
      />

      {/* Availability Editor */}
      <AvailabilityEditor
        open={showAvailability}
        onOpenChange={setShowAvailability}
        pageId={page.id}
        pageTitle={page.title}
      />
    </>
  );
}
