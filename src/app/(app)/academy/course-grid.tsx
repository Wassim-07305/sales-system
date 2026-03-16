"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Lock,
  Search,
  Settings,
  Zap,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CourseGridProps {
  courses: Array<{
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    position: number;
    modules: Array<{
      id: string;
      title: string;
      lessons: Array<{
        id: string;
        title: string;
        duration_minutes: number | null;
      }>;
    }>;
  }>;
  progressMap: Record<string, boolean>;
  isAdmin: boolean;
  moduleUnlockCounts?: Record<string, { unlocked: number; total: number }>;
}

type FilterTab = "all" | "in_progress" | "completed" | "not_started";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCourseStats(
  course: CourseGridProps["courses"][number],
  progressMap: Record<string, boolean>,
) {
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const totalModules = course.modules.length;
  const totalLessons = allLessons.length;
  const totalDuration = allLessons.reduce(
    (sum, l) => sum + (l.duration_minutes ?? 0),
    0,
  );
  const completedLessons = allLessons.filter((l) => progressMap[l.id]).length;
  const percent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalModules,
    totalLessons,
    totalDuration,
    completedLessons,
    percent,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseGrid({
  courses,
  progressMap,
  isAdmin,
  moduleUnlockCounts = {},
}: CourseGridProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<FilterTab>("all");

  // Pre-compute stats for every course once
  const coursesWithStats = useMemo(
    () =>
      courses.map((c) => ({
        ...c,
        stats: getCourseStats(c, progressMap),
      })),
    [courses, progressMap],
  );

  // Filtered list
  const filtered = useMemo(() => {
    let list = coursesWithStats;

    // Text search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }

    // Tab filter
    switch (tab) {
      case "in_progress":
        list = list.filter(
          (c) =>
            c.stats.completedLessons > 0 &&
            c.stats.completedLessons < c.stats.totalLessons,
        );
        break;
      case "completed":
        list = list.filter(
          (c) =>
            c.stats.totalLessons > 0 &&
            c.stats.completedLessons === c.stats.totalLessons,
        );
        break;
      case "not_started":
        list = list.filter((c) => c.stats.completedLessons === 0);
        break;
    }

    return list;
  }, [coursesWithStats, search, tab]);

  return (
    <div>
      {/* ---- Header ---- */}
      <PageHeader
        title="Academy"
        description="Formez-vous et développez vos compétences"
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/academy/micro">
            <Zap className="size-4" />
            Micro-learning
          </Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" size="sm">
            <Link href="/academy/admin">
              <Settings className="size-4" />
              Gérer les formations
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* ---- Tabs + Search ---- */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as FilterTab)}
        className="mb-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="in_progress">En cours</TabsTrigger>
            <TabsTrigger value="completed">Terminées</TabsTrigger>
            <TabsTrigger value="not_started">Non commencées</TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une formation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* All tab contents share the same grid — we control visibility via `filtered` */}
        {(["all", "in_progress", "completed", "not_started"] as const).map(
          (tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-6">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      stats={course.stats}
                      moduleUnlock={moduleUnlockCounts[course.id]}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </TabsContent>
          ),
        )}
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Course Card
// ---------------------------------------------------------------------------

function CourseCard({
  course,
  stats,
  moduleUnlock,
}: {
  course: CourseGridProps["courses"][number];
  stats: ReturnType<typeof getCourseStats>;
  moduleUnlock?: { unlocked: number; total: number };
}) {
  const isComplete = stats.totalLessons > 0 && stats.percent === 100;
  const hasLockedModules =
    moduleUnlock &&
    moduleUnlock.total > 1 &&
    moduleUnlock.unlocked < moduleUnlock.total;

  return (
    <Link href={`/academy/${course.id}`} className="group">
      <Card className="h-full gap-0 overflow-hidden rounded-2xl border border-border/50 p-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand/5">
        {/* ---- Thumbnail ---- */}
        <div className="relative aspect-video overflow-hidden rounded-t-2xl">
          {course.thumbnail_url ? (
            <Image
              src={course.thumbnail_url}
              alt={course.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/80 to-muted/40">
              <BookOpen className="size-14 text-brand/20" />
            </div>
          )}

          {/* Terminé badge overlay */}
          {isComplete && (
            <div className="absolute right-3 top-3">
              <Badge className="bg-brand text-brand-dark font-semibold">
                <CheckCircle2 className="size-3" />
                Terminé
              </Badge>
            </div>
          )}
        </div>

        {/* ---- Content ---- */}
        <CardContent className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 text-lg font-semibold transition-colors group-hover:text-brand">
            {course.title}
          </h3>

          {course.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {course.description}
            </p>
          )}

          {/* Stats */}
          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <span>{stats.totalModules} modules</span>
            <span aria-hidden="true">&middot;</span>
            <span>{stats.totalLessons} leçons</span>
            {stats.totalDuration > 0 && (
              <>
                <span aria-hidden="true">&middot;</span>
                <span>{stats.totalDuration} min</span>
              </>
            )}
          </div>

          {/* Module unlock progress */}
          {hasLockedModules && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <Lock className="size-3 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Module {moduleUnlock.unlocked}/{moduleUnlock.total} débloqué
              </span>
            </div>
          )}

          {/* Progress */}
          <div className="mt-auto pt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {stats.completedLessons}/{stats.totalLessons} leçons
              </span>
              <span className="font-medium">{stats.percent}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isComplete
                    ? "bg-brand shadow-[0_0_8px_rgba(122,241,122,0.3)]"
                    : "bg-brand/80",
                )}
                style={{ width: `${stats.percent}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="h-16 w-16 rounded-2xl bg-muted/40 ring-1 ring-border/30 flex items-center justify-center mb-4">
        <GraduationCap className="size-8 text-muted-foreground/40" />
      </div>
      <p className="font-medium text-sm">Aucune formation disponible</p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Revenez bientôt pour découvrir de nouvelles formations
      </p>
    </div>
  );
}
