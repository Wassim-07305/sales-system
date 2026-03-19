"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  GraduationCap,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  updateCourse,
  deleteCourse,
  seedDamienModules,
} from "@/lib/actions/academy-admin";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CourseFormDialog } from "./course-form-dialog";

interface CourseModule {
  id: string;
  title: string;
  position: number;
  lessons?: { id: string }[];
}

interface AdminCourse {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  position: number;
  target_roles: string[];
  created_at: string;
  modules: CourseModule[];
}

interface CourseListProps {
  initialCourses: AdminCourse[];
}

export function CourseList({ initialCourses }: CourseListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function handleSeedDamien() {
    setSeeding(true);
    try {
      const result = await seedDamienModules();
      if (result.created) {
        toast.success(
          "Les 13 modules de la S Academy ont été créés avec succès !",
        );
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.info(result.reason || "Les modules existent déjà.");
      }
    } catch {
      toast.error("Erreur lors de la création des modules");
    } finally {
      setSeeding(false);
    }
  }

  function handleCreate() {
    setEditingCourse(null);
    setDialogOpen(true);
  }

  function handleEdit(course: AdminCourse) {
    setEditingCourse(course);
    setDialogOpen(true);
  }

  function handleSaved() {
    setDialogOpen(false);
    setEditingCourse(null);
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleTogglePublish(course: AdminCourse) {
    setTogglingId(course.id);
    try {
      await updateCourse(course.id, {
        is_published: !course.is_published,
      });
      toast.success(
        course.is_published ? "Formation depubliee" : "Formation publiee",
      );
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Erreur lors de la mise a jour");
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(courseId: string) {
    if (
      !confirm("Supprimer cette formation ? Cette action est irreversible.")
    ) {
      return;
    }

    setDeletingId(courseId);
    try {
      await deleteCourse(courseId);
      toast.success("Formation supprimee");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  }

  function getModuleCount(course: AdminCourse): number {
    return course.modules?.length ?? 0;
  }

  function getLessonCount(course: AdminCourse): number {
    return (
      course.modules?.reduce(
        (acc, mod) => acc + (mod.lessons?.length ?? 0),
        0,
      ) ?? 0
    );
  }

  return (
    <div>
      <PageHeader
        title="Gestion des formations"
        description="Creez, modifiez et organisez vos formations"
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDamien}
            disabled={seeding || isPending}
            className="gap-2"
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GraduationCap className="h-4 w-4" />
            )}
            Initialiser modules Damien
          </Button>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle formation
          </Button>
        </div>
      </PageHeader>

      {initialCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Aucune formation</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Commencez par creer votre premiere formation
          </p>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Creer une formation
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialCourses.map((course) => {
            const moduleCount = getModuleCount(course);
            const lessonCount = getLessonCount(course);
            const isDeleting = deletingId === course.id;
            const isToggling = togglingId === course.id;

            return (
              <Card
                key={course.id}
                className={cn(
                  "group overflow-hidden transition-all hover:shadow-lg",
                  isDeleting && "opacity-50 pointer-events-none",
                )}
              >
                {/* Thumbnail */}
                <div className="relative h-[180px] bg-gradient-to-br from-muted to-muted/80 overflow-hidden">
                  {course.thumbnail_url ? (
                    <Image
                      src={course.thumbnail_url}
                      alt={course.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <BookOpen className="h-12 w-12 text-[#7af17a]/30" />
                    </div>
                  )}

                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={course.is_published ? "default" : "secondary"}
                      className={cn(
                        course.is_published
                          ? "bg-emerald-500/90 text-white hover:bg-emerald-500"
                          : "bg-muted/80 text-muted-foreground",
                      )}
                    >
                      {course.is_published ? "Publie" : "Brouillon"}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-base line-clamp-1">
                    {course.title}
                  </h3>

                  {/* Description */}
                  {course.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {course.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">
                      Aucune description
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {moduleCount} {moduleCount > 1 ? "modules" : "module"}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      {lessonCount} {lessonCount > 1 ? "lecons" : "lecon"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-border">
                    {/* Primary action: edit content (modules + lessons) */}
                    <Button
                      asChild
                      size="sm"
                      className="w-full gap-1.5 bg-brand text-brand-dark hover:bg-brand/90"
                    >
                      <Link href={`/academy/admin/${course.id}`}>
                        <Layers className="h-3.5 w-3.5" />
                        Modules &amp; Lecons
                      </Link>
                    </Button>

                    {/* Secondary actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => handleEdit(course)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Infos
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(course)}
                        disabled={isToggling || isPending}
                        title={course.is_published ? "Depublier" : "Publier"}
                      >
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : course.is_published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(course.id)}
                        disabled={isDeleting || isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Supprimer"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CourseFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCourse(null);
        }}
        course={editingCourse ?? undefined}
        onSaved={handleSaved}
      />
    </div>
  );
}
