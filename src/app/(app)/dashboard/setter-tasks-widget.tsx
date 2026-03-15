"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  createSetterTask,
  toggleSetterTask,
  deleteSetterTask,
} from "@/lib/actions/gamification";
import {
  Plus,
  Trash2,
  CheckCircle2,
  ListTodo,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
}

export function SetterTasksWidget({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTitle, setNewTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  const completedCount = tasks.filter((t) => t.completed).length;

  function handleAdd() {
    const title = newTitle.trim();
    if (!title) return;

    // Optimistic add
    const optimisticTask: Task = {
      id: `temp-${Date.now()}`,
      title,
      completed: false,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
    setTasks((prev) => [optimisticTask, ...prev]);
    setNewTitle("");

    startTransition(async () => {
      const result = await createSetterTask(title);
      if (result.error) {
        // Revert optimistic
        setTasks((prev) => prev.filter((t) => t.id !== optimisticTask.id));
      }
    });
  }

  function handleToggle(taskId: string) {
    // Optimistic toggle
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completed_at: !t.completed ? new Date().toISOString() : null,
            }
          : t
      )
    );

    startTransition(async () => {
      await toggleSetterTask(taskId);
    });
  }

  function handleDelete(taskId: string) {
    // Optimistic delete
    const removed = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    startTransition(async () => {
      const result = await deleteSetterTask(taskId);
      if (result.error && removed) {
        setTasks((prev) => [...prev, removed]);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <Card className="border-border/50 hover:shadow-md transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
              <ListTodo className="h-3.5 w-3.5 text-brand" />
            </div>
            Mes taches
          </CardTitle>
          {tasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {completedCount}/{tasks.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Add task input */}
        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="Ajouter une tache..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 text-sm bg-muted/30 border-border focus-visible:ring-brand/40"
            disabled={isPending}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAdd}
            disabled={!newTitle.trim() || isPending}
            className="h-9 w-9 p-0 shrink-0 text-brand hover:bg-brand/10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="h-10 w-10 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">Aucune tache</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Ajoutez vos taches du jour ci-dessus
            </p>
          </div>
        ) : (
          <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-2.5 py-2 px-2.5 -mx-2.5 rounded-lg group transition-colors",
                  task.completed
                    ? "bg-muted/20 opacity-60"
                    : "hover:bg-muted/30"
                )}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => handleToggle(task.id)}
                  className={cn(
                    "shrink-0 border-border",
                    task.completed && "border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground"
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-sm truncate",
                    task.completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(task.id)}
                  className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
