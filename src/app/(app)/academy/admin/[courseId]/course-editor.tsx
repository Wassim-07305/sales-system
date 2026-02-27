"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Plus,
  BookOpen,
  FileText,
  Video,
  Clock,
  Paperclip,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/ui/file-upload";
import { cn } from "@/lib/utils";

import {
  updateModule,
  deleteModule,
  reorderModules,
  updateLesson,
  deleteLesson,
  reorderLessons,
  addLessonAttachment,
  removeLessonAttachment,
} from "@/lib/actions/academy-admin";

import { ModuleFormDialog } from "./module-form-dialog";
import { LessonFormDialog } from "./lesson-form-dialog";

import type { Course, CourseModule, Lesson } from "@/lib/types/database";

// ─── Types ───────────────────────────────────────────────────

type ModuleWithLessons = CourseModule & { lessons: Lesson[] };

type Selection =
  | { type: "module"; module: ModuleWithLessons }
  | { type: "lesson"; module: ModuleWithLessons; lesson: Lesson }
  | null;

interface CourseEditorProps {
  course: Course & { modules: ModuleWithLessons[] };
}

// ─── Composant SortableItem generique ────────────────────────

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (listeners: Record<string, unknown> | undefined) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}

// ─── Composant principal CourseEditor ────────────────────────

export function CourseEditor({ course }: CourseEditorProps) {
  const [modules, setModules] = useState<ModuleWithLessons[]>(course.modules);
  const [selection, setSelection] = useState<Selection>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );
  const [isPending, startTransition] = useTransition();

  // Dialogs
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<ModuleWithLessons | null>(null);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonDialogModuleId, setLessonDialogModuleId] = useState<string | null>(null);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ─── Expand / Collapse ───────────────────────────────────

  const toggleExpand = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // ─── Selection ───────────────────────────────────────────

  const selectModule = useCallback(
    (mod: ModuleWithLessons) => {
      setSelection({ type: "module", module: mod });
    },
    []
  );

  const selectLesson = useCallback(
    (mod: ModuleWithLessons, lesson: Lesson) => {
      setSelection({ type: "lesson", module: mod, lesson });
    },
    []
  );

  // ─── Module actions ──────────────────────────────────────

  const handleEditModule = useCallback((mod: ModuleWithLessons) => {
    setEditingModule(mod);
    setModuleDialogOpen(true);
  }, []);

  const handleDeleteModule = useCallback(
    (moduleId: string) => {
      if (!confirm("Supprimer ce module et toutes ses lecons ?")) return;
      startTransition(async () => {
        try {
          await deleteModule(moduleId);
          setModules((prev) => prev.filter((m) => m.id !== moduleId));
          if (selection?.type === "module" && selection.module.id === moduleId) {
            setSelection(null);
          }
          if (selection?.type === "lesson" && selection.module.id === moduleId) {
            setSelection(null);
          }
          toast.success("Module supprime");
        } catch {
          toast.error("Erreur lors de la suppression du module");
        }
      });
    },
    [selection]
  );

  const handleModuleSaved = useCallback(
    (savedModule: { id: string; title: string; description: string | null }) => {
      setModules((prev) => {
        // Mise a jour existant
        const idx = prev.findIndex((m) => m.id === savedModule.id);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...savedModule };
          return updated;
        }
        // Nouveau module
        const newMod: ModuleWithLessons = {
          id: savedModule.id,
          course_id: course.id,
          title: savedModule.title,
          description: savedModule.description,
          position: prev.length,
          created_at: new Date().toISOString(),
          lessons: [],
        };
        return [...prev, newMod];
      });
      setExpandedModules((prev) => new Set([...prev, savedModule.id]));
      setEditingModule(null);
    },
    [course.id]
  );

  // ─── Lesson actions ──────────────────────────────────────

  const handleAddLesson = useCallback((moduleId: string) => {
    setLessonDialogModuleId(moduleId);
    setLessonDialogOpen(true);
  }, []);

  const handleDeleteLesson = useCallback(
    (moduleId: string, lessonId: string) => {
      if (!confirm("Supprimer cette lecon ?")) return;
      startTransition(async () => {
        try {
          await deleteLesson(lessonId);
          setModules((prev) =>
            prev.map((m) =>
              m.id === moduleId
                ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
                : m
            )
          );
          if (selection?.type === "lesson" && selection.lesson.id === lessonId) {
            setSelection(null);
          }
          toast.success("Lecon supprimee");
        } catch {
          toast.error("Erreur lors de la suppression de la lecon");
        }
      });
    },
    [selection]
  );

  const handleLessonSaved = useCallback(
    (savedLesson: { id: string; title: string; description: string | null; module_id: string }) => {
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== savedLesson.module_id) return m;
          const existingIdx = m.lessons.findIndex((l) => l.id === savedLesson.id);
          if (existingIdx !== -1) {
            const updated = [...m.lessons];
            updated[existingIdx] = { ...updated[existingIdx], ...savedLesson };
            return { ...m, lessons: updated };
          }
          const newLesson: Lesson = {
            id: savedLesson.id,
            course_id: course.id,
            module_id: savedLesson.module_id,
            title: savedLesson.title,
            description: savedLesson.description,
            position: m.lessons.length,
            video_url: null,
            transcript: null,
            duration_minutes: null,
            attachments: [],
            content_html: null,
            created_at: new Date().toISOString(),
          };
          return { ...m, lessons: [...m.lessons, newLesson] };
        })
      );
      setExpandedModules((prev) => new Set([...prev, savedLesson.module_id]));
    },
    [course.id]
  );

  // ─── Drag & Drop: Modules ───────────────────────────────

  const handleModuleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(modules, oldIndex, newIndex);
      setModules(reordered);

      startTransition(async () => {
        try {
          await reorderModules(
            course.id,
            reordered.map((m) => m.id)
          );
        } catch {
          toast.error("Erreur lors du reordonnancement des modules");
          setModules(modules);
        }
      });
    },
    [modules, course.id]
  );

  // ─── Drag & Drop: Lecons dans un module ─────────────────

  const handleLessonDragEnd = useCallback(
    (moduleId: string) => (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m;
          const oldIdx = m.lessons.findIndex((l) => l.id === active.id);
          const newIdx = m.lessons.findIndex((l) => l.id === over.id);
          if (oldIdx === -1 || newIdx === -1) return m;

          const reordered = arrayMove(m.lessons, oldIdx, newIdx);

          startTransition(async () => {
            try {
              await reorderLessons(
                moduleId,
                reordered.map((l) => l.id)
              );
            } catch {
              toast.error("Erreur lors du reordonnancement des lecons");
            }
          });

          return { ...m, lessons: reordered };
        })
      );
    },
    []
  );

  // ─── Rendu ──────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ═══ Colonne gauche : arborescence ═══ */}
      <aside className="w-80 shrink-0 border-r overflow-y-auto bg-muted/20">
        <div className="p-4 space-y-4">
          {/* Retour + titre */}
          <div className="space-y-3">
            <Link
              href="/academy/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Link>
            <h1 className="text-lg font-semibold leading-tight">{course.title}</h1>
            <p className="text-xs text-muted-foreground">
              {modules.length} module{modules.length > 1 ? "s" : ""} &middot;{" "}
              {modules.reduce((sum, m) => sum + m.lessons.length, 0)} lecon
              {modules.reduce((sum, m) => sum + m.lessons.length, 0) > 1 ? "s" : ""}
            </p>
          </div>

          {/* Ajouter un module */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setEditingModule(null);
              setModuleDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un module
          </Button>

          {/* Liste des modules (DnD) */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleModuleDragEnd}
          >
            <SortableContext
              items={modules.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {modules.map((mod) => {
                  const isExpanded = expandedModules.has(mod.id);
                  const isModuleSelected =
                    selection?.type === "module" && selection.module.id === mod.id;

                  return (
                    <SortableItem key={mod.id} id={mod.id}>
                      {(listeners) => (
                        <div className="rounded-lg border bg-background">
                          {/* En-tete du module */}
                          <div
                            className={cn(
                              "flex items-center gap-1 px-2 py-2 rounded-t-lg transition-colors cursor-pointer",
                              isModuleSelected && "bg-brand/10"
                            )}
                          >
                            <button
                              className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
                              {...(listeners as Record<string, unknown>)}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => toggleExpand(mod.id)}
                              className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>

                            <button
                              className="flex-1 text-left text-sm font-medium truncate"
                              onClick={() => selectModule(mod)}
                            >
                              {mod.title}
                            </button>

                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {mod.lessons.length}
                            </Badge>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditModule(mod);
                              }}
                              className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModule(mod.id);
                              }}
                              className="shrink-0 p-1 text-muted-foreground hover:text-destructive rounded"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* Lecons du module */}
                          {isExpanded && (
                            <div className="border-t">
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleLessonDragEnd(mod.id)}
                              >
                                <SortableContext
                                  items={mod.lessons.map((l) => l.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  <div className="py-1">
                                    {mod.lessons.map((lesson) => {
                                      const isLessonSelected =
                                        selection?.type === "lesson" &&
                                        selection.lesson.id === lesson.id;

                                      return (
                                        <SortableItem key={lesson.id} id={lesson.id}>
                                          {(lessonListeners) => (
                                            <div
                                              className={cn(
                                                "flex items-center gap-1 px-3 py-1.5 ml-4 mr-2 rounded transition-colors",
                                                isLessonSelected
                                                  ? "bg-brand/10"
                                                  : "hover:bg-muted/50"
                                              )}
                                            >
                                              <button
                                                className="shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-0.5"
                                                {...(lessonListeners as Record<string, unknown>)}
                                              >
                                                <GripVertical className="h-3.5 w-3.5" />
                                              </button>

                                              <button
                                                className="flex-1 text-left text-xs truncate"
                                                onClick={() => selectLesson(mod, lesson)}
                                              >
                                                {lesson.title}
                                              </button>

                                              {lesson.duration_minutes && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-[10px] shrink-0 font-normal"
                                                >
                                                  {lesson.duration_minutes} min
                                                </Badge>
                                              )}

                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  selectLesson(mod, lesson);
                                                }}
                                                className="shrink-0 p-0.5 text-muted-foreground hover:text-foreground rounded"
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </button>

                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteLesson(mod.id, lesson.id);
                                                }}
                                                className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive rounded"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </button>
                                            </div>
                                          )}
                                        </SortableItem>
                                      );
                                    })}
                                  </div>
                                </SortableContext>
                              </DndContext>

                              {/* Ajouter une lecon */}
                              <div className="px-3 pb-2 pt-1">
                                <button
                                  onClick={() => handleAddLesson(mod.id)}
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pl-5"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Ajouter une lecon
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </SortableItem>
                  );
                })}

                {modules.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>Aucun module</p>
                    <p className="text-xs mt-1">Commencez par ajouter un module</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </aside>

      {/* ═══ Colonne droite : editeur ═══ */}
      <main className="flex-1 overflow-y-auto p-6">
        {!selection && <EmptyState />}
        {selection?.type === "module" && (
          <ModuleEditor
            key={selection.module.id}
            mod={selection.module}
            onUpdate={(updated) => {
              setModules((prev) =>
                prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
              );
              setSelection({ type: "module", module: { ...selection.module, ...updated } });
            }}
          />
        )}
        {selection?.type === "lesson" && (
          <LessonEditor
            key={selection.lesson.id}
            lesson={selection.lesson}
            moduleTitle={selection.module.title}
            onUpdate={(updated) => {
              setModules((prev) =>
                prev.map((m) =>
                  m.id === selection.module.id
                    ? {
                        ...m,
                        lessons: m.lessons.map((l) =>
                          l.id === updated.id ? { ...l, ...updated } : l
                        ),
                      }
                    : m
                )
              );
              setSelection({
                type: "lesson",
                module: selection.module,
                lesson: { ...selection.lesson, ...updated },
              });
            }}
          />
        )}
      </main>

      {/* ═══ Dialogs ═══ */}
      <ModuleFormDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        courseId={course.id}
        module={editingModule}
        onSaved={handleModuleSaved}
      />

      {lessonDialogModuleId && (
        <LessonFormDialog
          open={lessonDialogOpen}
          onOpenChange={(open) => {
            setLessonDialogOpen(open);
            if (!open) setLessonDialogModuleId(null);
          }}
          courseId={course.id}
          moduleId={lessonDialogModuleId}
          onSaved={handleLessonSaved}
        />
      )}
    </div>
  );
}

// ─── Etat vide ──────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileText className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">Selectionnez un element</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Cliquez sur un module ou une lecon dans le panneau de gauche pour modifier son contenu.
      </p>
    </div>
  );
}

// ─── Editeur de module ──────────────────────────────────────

function ModuleEditor({
  mod,
  onUpdate,
}: {
  mod: ModuleWithLessons;
  onUpdate: (updated: Partial<CourseModule> & { id: string }) => void;
}) {
  const [title, setTitle] = useState(mod.title);
  const [description, setDescription] = useState(mod.description || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    setSaving(true);
    try {
      await updateModule(mod.id, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      onUpdate({ id: mod.id, title: title.trim(), description: description.trim() || null });
      toast.success("Module mis a jour");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">
          <BookOpen className="h-3 w-3 mr-1" />
          Module
        </Badge>
        <h2 className="text-xl font-semibold">{mod.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mod.lessons.length} lecon{mod.lessons.length > 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-title">Titre</Label>
            <Input
              id="module-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre du module"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-desc">Description</Label>
            <Textarea
              id="module-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description du module (optionnelle)"
              rows={4}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Editeur de lecon ───────────────────────────────────────

function LessonEditor({
  lesson,
  moduleTitle,
  onUpdate,
}: {
  lesson: Lesson;
  moduleTitle: string;
  onUpdate: (updated: Partial<Lesson> & { id: string }) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description || "");
  const [videoUrl, setVideoUrl] = useState(lesson.video_url || "");
  const [duration, setDuration] = useState<string>(
    lesson.duration_minutes?.toString() || ""
  );
  const [attachments, setAttachments] = useState(lesson.attachments || []);
  const [saving, setSaving] = useState(false);
  const [addingAttachment, setAddingAttachment] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Le titre est obligatoire");
      return;
    }
    setSaving(true);
    try {
      const durationNum = duration ? parseInt(duration, 10) : null;
      await updateLesson(lesson.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        video_url: videoUrl.trim() || null,
        duration_minutes: durationNum,
      });
      onUpdate({
        id: lesson.id,
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl.trim() || null,
        duration_minutes: durationNum,
      });
      toast.success("Lecon mise a jour");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleAttachmentUpload = async (url: string) => {
    setAddingAttachment(true);
    try {
      const fileName = url.split("/").pop() || "fichier";
      const ext = fileName.split(".").pop()?.toLowerCase() || "";
      const attachment = { name: fileName, url, type: ext };
      await addLessonAttachment(lesson.id, attachment);
      const updated = [...attachments, attachment];
      setAttachments(updated);
      onUpdate({ id: lesson.id, attachments: updated });
      toast.success("Piece jointe ajoutee");
    } catch {
      toast.error("Erreur lors de l'ajout de la piece jointe");
    } finally {
      setAddingAttachment(false);
    }
  };

  const handleRemoveAttachment = async (attachmentUrl: string) => {
    try {
      await removeLessonAttachment(lesson.id, attachmentUrl);
      const updated = attachments.filter((a) => a.url !== attachmentUrl);
      setAttachments(updated);
      onUpdate({ id: lesson.id, attachments: updated });
      toast.success("Piece jointe supprimee");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Badge variant="secondary" className="mb-3">
          <FileText className="h-3 w-3 mr-1" />
          Lecon
        </Badge>
        <p className="text-xs text-muted-foreground mb-1">{moduleTitle}</p>
        <h2 className="text-xl font-semibold">{lesson.title}</h2>
      </div>

      {/* Informations generales */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Titre</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la lecon"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson-desc">Description</Label>
            <Textarea
              id="lesson-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de la lecon (optionnelle)"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-duration">
                <Clock className="h-3.5 w-3.5 inline mr-1.5" />
                Duree (minutes)
              </Label>
              <Input
                id="lesson-duration"
                type="number"
                min={0}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Ex : 15"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand text-brand-dark hover:bg-brand/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Video */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Video</Label>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="video-url">URL de la video (YouTube, Vimeo, etc.)</Label>
              <Input
                id="video-url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <div className="relative flex items-center">
              <div className="flex-1 border-t" />
              <span className="px-3 text-xs text-muted-foreground bg-background">ou</span>
              <div className="flex-1 border-t" />
            </div>

            <FileUpload
              bucket="academy"
              path="videos"
              accept="video/*"
              maxSize={500}
              onUpload={(url) => setVideoUrl(url)}
              onRemove={() => setVideoUrl("")}
              currentUrl={
                videoUrl && !videoUrl.startsWith("http") ? videoUrl : undefined
              }
              label="Glissez une video ou cliquez pour uploader"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pieces jointes */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-semibold">Pieces jointes</Label>
          </div>

          {/* Liste des pieces jointes existantes */}
          {attachments.length > 0 && (
            <div className="space-y-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{att.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{att.type}</p>
                  </div>
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand hover:underline shrink-0"
                  >
                    Ouvrir
                  </a>
                  <button
                    onClick={() => handleRemoveAttachment(att.url)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload nouvelle piece jointe */}
          <FileUpload
            bucket="academy"
            path="attachments"
            accept="*/*"
            maxSize={50}
            onUpload={handleAttachmentUpload}
            label="Ajouter une piece jointe"
          />

          {addingAttachment && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
