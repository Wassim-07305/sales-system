"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, User, BookOpen, Target, PenLine, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { toggleChecklistItem } from "@/lib/actions/onboarding";
import { useTransition } from "react";

interface ChecklistItem {
  id: string;
  label: string;
  link: string;
  icon: string;
  completed: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  user: User,
  book: BookOpen,
  target: Target,
  edit: PenLine,
  calendar: Calendar,
  users: Users,
};

export function OnboardingChecklist({ items }: { items: ChecklistItem[] }) {
  const [isPending, startTransition] = useTransition();
  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  function handleToggle(itemId: string) {
    startTransition(async () => {
      await toggleChecklistItem(itemId);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span>Checklist de demarrage</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={progress} className="h-2 [&>div]:bg-green-500" />
          <p className="text-xs text-muted-foreground mt-1">{progress}% complete</p>
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || Circle;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors",
                  item.completed && "opacity-60"
                )}
              >
                <button
                  onClick={() => handleToggle(item.id)}
                  disabled={isPending}
                  className="shrink-0"
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link
                  href={item.link}
                  className={cn(
                    "text-sm flex-1",
                    item.completed && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
        </div>
        {progress === 100 && (
          <p className="text-sm text-green-600 font-medium text-center pt-2">
            Bravo ! Tu as termine toutes les etapes de demarrage !
          </p>
        )}
      </CardContent>
    </Card>
  );
}
