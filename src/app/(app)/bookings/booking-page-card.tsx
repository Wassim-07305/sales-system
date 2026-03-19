"use client";

import { useState, useTransition } from "react";
import {
  Copy,
  Check,
  Pencil,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
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

interface BookingPageCardProps {
  page: BookingPage;
}

export function BookingPageCard({ page }: BookingPageCardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [copied, setCopied] = useState(false);

  const bookingUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/book/${page.slug}`
      : `/book/${page.slug}`;

  function handleCopyUrl() {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success("URL copiée !");
    setTimeout(() => setCopied(false), 2000);
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

  const creator =
    (page as BookingPage & { creator?: { full_name?: string } }).creator
      ?.full_name || null;

  return (
    <>
      <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
        {/* Header: dot + title + badge actif */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: page.brand_color }}
            />
            <div>
              <h3 className="font-semibold text-foreground leading-tight">
                {page.title}
              </h3>
              {creator && (
                <p className="text-sm text-muted-foreground">{creator}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleToggleActive}
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              page.is_active
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {page.is_active ? (
              <>
                <Eye className="h-3 w-3" /> Actif
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" /> Inactif
              </>
            )}
          </button>
        </div>

        {/* Config badges */}
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-2 py-0.5">
            {page.slot_duration} min
          </span>
          {page.buffer_minutes > 0 && (
            <span className="rounded bg-muted px-2 py-0.5">
              Buffer {page.buffer_minutes} min
            </span>
          )}
          <span className="rounded bg-muted px-2 py-0.5">
            {page.max_days_ahead}j max
          </span>
        </div>

        {/* URL bar with copy + external link */}
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <code className="flex-1 truncate text-xs text-muted-foreground">
            /book/{page.slug}
          </code>
          <button
            onClick={handleCopyUrl}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Copier le lien"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
            title="Ouvrir"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* Actions: Gérer les disponibilités + edit + delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAvailability(true)}
            className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Gérer les disponibilités
          </button>
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg border border-border p-2 text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

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
