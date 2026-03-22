"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Plus,
  Play,
  Download,
  Share2,
  Trash2,
  GripVertical,
  Loader2,
} from "lucide-react";
import type {
  Presentation,
  PresentationSlide,
  PresentationTheme,
  SlideLayout,
} from "@/lib/types/database";
import {
  updatePresentation,
  addSlide,
  deleteSlide,
  reorderSlides,
} from "@/lib/actions/genspark";
import { SlideRenderer } from "@/components/genspark/slide-renderer";
import { SlideThumbnail } from "@/components/genspark/slide-thumbnail";
import { SlideEditorPanel } from "@/components/genspark/slide-editor-panel";
import { ThemePicker } from "@/components/genspark/theme-picker";
import { ShareDialog } from "@/components/genspark/share-dialog";

interface EditorViewProps {
  presentation: Presentation;
  slides: PresentationSlide[];
}

// Sortable thumbnail wrapper
function SortableSlideItem({
  slide,
  theme,
  index,
  isActive,
  onClick,
  onDelete,
}: {
  slide: PresentationSlide;
  theme: PresentationTheme;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: slide.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <SlideThumbnail
        slide={slide}
        theme={theme}
        index={index}
        isActive={isActive}
        onClick={onClick}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 rounded bg-destructive/90 flex items-center justify-center"
      >
        <Trash2 className="h-3 w-3 text-white" />
      </button>
    </div>
  );
}

export function EditorView({
  presentation,
  slides: initialSlides,
}: EditorViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slides, setSlides] = useState(initialSlides);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [title, setTitle] = useState(presentation.title);
  const [theme, setTheme] = useState(presentation.theme);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const activeSlide = slides[activeSlideIndex] || null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Title save
  const handleTitleBlur = useCallback(() => {
    if (title !== presentation.title) {
      startTransition(async () => {
        try {
          await updatePresentation(presentation.id, { title });
        } catch {
          toast.error("Erreur lors de la sauvegarde du titre");
        }
      });
    }
  }, [title, presentation.id, presentation.title]);

  // Theme change
  function handleThemeChange(newTheme: PresentationTheme) {
    setTheme(newTheme);
    startTransition(async () => {
      try {
        await updatePresentation(presentation.id, { theme: newTheme });
      } catch {
        toast.error("Erreur lors du changement de thème");
      }
    });
  }

  // Add slide
  function handleAddSlide() {
    startTransition(async () => {
      try {
        const newSlide = await addSlide(presentation.id, {
          layout: "title_content" as SlideLayout,
          content: { title: "Nouveau slide", body: "" },
        });
        if (newSlide) {
          setSlides((prev) => [...prev, newSlide]);
          setActiveSlideIndex(slides.length);
        }
      } catch {
        toast.error("Erreur lors de l'ajout du slide");
      }
    });
  }

  // Delete slide
  function handleDeleteSlide(slideId: string) {
    startTransition(async () => {
      try {
        await deleteSlide(slideId);
        setSlides((prev) => prev.filter((s) => s.id !== slideId));
        if (activeSlideIndex >= slides.length - 1) {
          setActiveSlideIndex(Math.max(0, slides.length - 2));
        }
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    });
  }

  // Reorder slides (dnd-kit)
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = slides.findIndex((s) => s.id === active.id);
    const newIndex = slides.findIndex((s) => s.id === over.id);
    const newSlides = arrayMove(slides, oldIndex, newIndex);
    setSlides(newSlides);

    // Update active index if it moved
    if (activeSlideIndex === oldIndex) {
      setActiveSlideIndex(newIndex);
    }

    // Persist
    startTransition(async () => {
      try {
        await reorderSlides(
          presentation.id,
          newSlides.map((s) => s.id),
        );
      } catch {
        toast.error("Erreur lors du réordonnancement");
      }
    });
  }

  // Update a slide locally
  function handleSlideUpdate(updatedSlide: PresentationSlide) {
    setSlides((prev) =>
      prev.map((s) => (s.id === updatedSlide.id ? updatedSlide : s)),
    );
  }

  // PDF export
  async function handleExportPdf() {
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { PresentationPDF } =
        await import("@/components/genspark/presentation-pdf");
      const blob = await pdf(
        <PresentationPDF
          presentation={{ ...presentation, theme }}
          slides={slides}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "presentation"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF exporté");
    } catch {
      toast.error("Erreur lors de l'export PDF");
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/genspark">
            <Button variant="ghost" size="sm" className="h-8">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="h-8 w-64 text-sm font-semibold border-transparent hover:border-border focus:border-emerald-500"
          />
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemePicker value={theme} onChange={handleThemeChange} />
          <div className="h-6 w-px bg-border/50 mx-1" />
          <Link href={`/genspark/${presentation.id}/present`}>
            <Button size="sm" variant="outline" className="h-8 text-xs">
              <Play className="h-3.5 w-3.5 mr-1" />
              Présenter
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleExportPdf}
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setShowShareDialog(true)}
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Partager
          </Button>
        </div>
      </div>

      {/* 3-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: thumbnails */}
        <div className="w-[200px] border-r border-border/50 overflow-y-auto p-3 space-y-2 shrink-0">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={slides.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {slides.map((slide, index) => (
                <SortableSlideItem
                  key={slide.id}
                  slide={slide}
                  theme={theme}
                  index={index}
                  isActive={index === activeSlideIndex}
                  onClick={() => setActiveSlideIndex(index)}
                  onDelete={() => handleDeleteSlide(slide.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-dashed"
            onClick={handleAddSlide}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ajouter
          </Button>
        </div>

        {/* Center: slide preview */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 p-8 overflow-auto">
          {activeSlide ? (
            <div className="w-full max-w-4xl">
              <SlideRenderer
                slide={activeSlide}
                theme={theme}
                className="shadow-2xl shadow-black/20 rounded-xl"
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun slide sélectionné</p>
          )}
        </div>

        {/* Right panel: editor */}
        <div className="w-[300px] border-l border-border/50 shrink-0 overflow-hidden">
          {activeSlide ? (
            <SlideEditorPanel
              key={activeSlide.id}
              slide={activeSlide}
              onSlideUpdate={handleSlideUpdate}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Sélectionnez un slide
            </div>
          )}
        </div>
      </div>

      {/* Share dialog */}
      <ShareDialog
        presentationId={presentation.id}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </div>
  );
}
