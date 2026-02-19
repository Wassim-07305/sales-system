"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Course, LessonProgress } from "@/lib/types/database";
import { BookOpen, Clock, CheckCircle2 } from "lucide-react";

interface CourseGridProps {
  courses: Course[];
  progress: LessonProgress[];
}

export function CourseGrid({ courses, progress }: CourseGridProps) {
  function getCourseProgress(course: Course) {
    const lessonIds = course.lessons?.map((l) => l.id) || [];
    const completedLessons = progress.filter(
      (p) => lessonIds.includes(p.lesson_id) && p.completed
    );
    if (lessonIds.length === 0) return 0;
    return Math.round((completedLessons.length / lessonIds.length) * 100);
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => {
        const courseProgress = getCourseProgress(course);
        const totalLessons = course.lessons?.length || 0;
        const completedCount = progress.filter(
          (p) =>
            course.lessons?.some((l) => l.id === p.lesson_id) && p.completed
        ).length;
        const isComplete = courseProgress === 100;

        return (
          <Link key={course.id} href={`/academy/${course.id}`}>
            <Card className="group hover:shadow-lg transition-all h-full cursor-pointer">
              {/* Thumbnail */}
              <div className="relative h-40 bg-gradient-to-br from-brand-dark to-brand-dark/80 rounded-t-lg overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <BookOpen className="h-12 w-12 text-brand/30" />
                  </div>
                )}
                {isComplete && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-brand text-brand-dark">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Terminé
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 group-hover:text-brand transition-colors">
                  {course.title}
                </h3>
                {course.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    {totalLessons} leçons
                  </span>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">
                      {completedCount}/{totalLessons} leçons
                    </span>
                    <span className="font-medium">{courseProgress}%</span>
                  </div>
                  <Progress value={courseProgress} className="h-1.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}

      {courses.length === 0 && (
        <div className="col-span-full text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucune formation disponible pour le moment</p>
        </div>
      )}
    </div>
  );
}
