"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  CalendarCheck,
  ListChecks,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  UserPlus,
  Zap,
  ArrowRight,
} from "lucide-react";
import {
  completeFollowUpTask,
  createFollowUpSequence,
  assignFollowUpSequence,
} from "@/lib/actions/hub-setting";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface Task {
  id: string;
  prospect_id: string;
  sequence_id: string | null;
  step_order: number | null;
  action: string;
  message_template: string | null;
  scheduled_at: string;
  status: string;
  completed_at: string | null;
  prospect: {
    id: string;
    name: string;
    platform: string;
    status: string;
    profile_url: string | null;
  } | null;
  sequence: {
    id: string;
    name: string;
  } | null;
}

interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  day_offset: number;
  action: string;
  message_template: string;
}

interface Sequence {
  id: string;
  name: string;
  created_at: string;
  steps: SequenceStep[];
}

interface Prospect {
  id: string;
  name: string;
  platform: string;
  status: string;
}

interface Props {
  tasks: Task[];
  sequences: Sequence[];
  prospects: Prospect[];
}

export function FollowUpsView({ tasks, sequences, prospects }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create sequence state
  const [showCreateSeq, setShowCreateSeq] = useState(false);
  const [seqName, setSeqName] = useState("");
  const [seqSteps, setSeqSteps] = useState<
    { day_offset: number; action: string; message_template: string }[]
  >([{ day_offset: 1, action: "dm", message_template: "" }]);
  const [creatingSeq, setCreatingSeq] = useState(false);

  // Assign sequence state
  const [showAssign, setShowAssign] = useState(false);
  const [assignProspectId, setAssignProspectId] = useState("");
  const [assignSequenceId, setAssignSequenceId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Filter tasks
  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const todayTasks = pendingTasks.filter((t) => {
    const date = new Date(t.scheduled_at);
    return isToday(date) || isPast(date);
  });
  const upcomingTasks = pendingTasks.filter((t) => {
    const date = new Date(t.scheduled_at);
    return !isToday(date) && !isPast(date);
  });
  const completedTasks = tasks.filter((t) => t.status === "completed");

  async function handleCompleteTask(taskId: string) {
    startTransition(async () => {
      try {
        await completeFollowUpTask(taskId);
        toast.success("Tâche complétée");
        router.refresh();
      } catch {
        toast.error("Erreur lors de la complétion");
      }
    });
  }

  async function handleCreateSequence() {
    if (!seqName.trim()) {
      toast.error("Entrez un nom pour la séquence");
      return;
    }
    if (seqSteps.some((s) => !s.action.trim())) {
      toast.error("Remplissez toutes les actions des étapes");
      return;
    }
    setCreatingSeq(true);
    try {
      await createFollowUpSequence({ name: seqName, steps: seqSteps });
      toast.success("Séquence créée avec succès");
      setShowCreateSeq(false);
      setSeqName("");
      setSeqSteps([{ day_offset: 1, action: "dm", message_template: "" }]);
      router.refresh();
    } catch {
      toast.error("Erreur lors de la création");
    } finally {
      setCreatingSeq(false);
    }
  }

  async function handleAssignSequence() {
    if (!assignProspectId || !assignSequenceId) {
      toast.error("Sélectionnez un prospect et une séquence");
      return;
    }
    setAssigning(true);
    try {
      await assignFollowUpSequence(assignProspectId, assignSequenceId);
      toast.success("Séquence assignée au prospect");
      setShowAssign(false);
      setAssignProspectId("");
      setAssignSequenceId("");
      router.refresh();
    } catch {
      toast.error("Erreur lors de l'assignation");
    } finally {
      setAssigning(false);
    }
  }

  function addStep() {
    const lastOffset =
      seqSteps.length > 0
        ? seqSteps[seqSteps.length - 1].day_offset
        : 0;
    setSeqSteps([
      ...seqSteps,
      { day_offset: lastOffset + 2, action: "dm", message_template: "" },
    ]);
  }

  function removeStep(index: number) {
    setSeqSteps(seqSteps.filter((_, i) => i !== index));
  }

  function updateStep(
    index: number,
    field: keyof (typeof seqSteps)[0],
    value: string | number
  ) {
    setSeqSteps(
      seqSteps.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }

  function getScheduleLabel(dateStr: string) {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return "En retard";
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    return format(date, "d MMMM", { locale: fr });
  }

  function getScheduleColor(dateStr: string) {
    const date = new Date(dateStr);
    if (isPast(date) && !isToday(date)) return "bg-foreground/10 text-foreground border-foreground/20";
    if (isToday(date)) return "bg-brand/20 text-brand-dark border-brand/30";
    return "bg-muted/50 text-muted-foreground border-border/50";
  }

  return (
    <div>
      <PageHeader
        title="Suivi & Relances"
        description="Gérez vos séquences de follow-up et tâches de relance"
      >
        <div className="flex gap-2">
          <Dialog open={showAssign} onOpenChange={setShowAssign}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Assigner séquence
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assigner une séquence</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Prospect
                  </label>
                  <Select
                    value={assignProspectId}
                    onValueChange={setAssignProspectId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un prospect" />
                    </SelectTrigger>
                    <SelectContent>
                      {prospects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Séquence
                  </label>
                  <Select
                    value={assignSequenceId}
                    onValueChange={setAssignSequenceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une séquence" />
                    </SelectTrigger>
                    <SelectContent>
                      {sequences.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.steps.length} étapes)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAssignSequence}
                  disabled={assigning}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Assigner
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showCreateSeq} onOpenChange={setShowCreateSeq}>
            <DialogTrigger asChild>
              <Button className="bg-brand text-brand-dark hover:bg-brand/90" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle séquence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer une séquence de relance</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Nom de la séquence
                  </label>
                  <Input
                    placeholder="Ex: Relance LinkedIn 3 étapes"
                    value={seqName}
                    onChange={(e) => setSeqName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Étapes
                  </label>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-3">
                      {seqSteps.map((step, index) => (
                        <Card key={index}>
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                Étape {index + 1}
                              </Badge>
                              {seqSteps.length > 1 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeStep(index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Jour (J+)
                                </label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={step.day_offset}
                                  onChange={(e) =>
                                    updateStep(
                                      index,
                                      "day_offset",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">
                                  Action
                                </label>
                                <Select
                                  value={step.action}
                                  onValueChange={(val) =>
                                    updateStep(index, "action", val)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="dm">DM</SelectItem>
                                    <SelectItem value="comment">
                                      Commenter
                                    </SelectItem>
                                    <SelectItem value="like">
                                      Liker
                                    </SelectItem>
                                    <SelectItem value="story_reply">
                                      Répondre story
                                    </SelectItem>
                                    <SelectItem value="call">
                                      Appeler
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">
                                Template de message
                              </label>
                              <Textarea
                                placeholder="Ex: Bonjour {name}, suite à mon dernier message..."
                                value={step.message_template}
                                onChange={(e) =>
                                  updateStep(
                                    index,
                                    "message_template",
                                    e.target.value
                                  )
                                }
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addStep}
                    className="w-full mt-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter une étape
                  </Button>
                </div>

                <Button
                  onClick={handleCreateSequence}
                  disabled={creatingSeq}
                  className="w-full bg-brand text-brand-dark hover:bg-brand/90"
                >
                  {creatingSeq ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Créer la séquence
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Tabs defaultValue="today">
        <TabsList className="mb-6">
          <TabsTrigger value="today">
            <CalendarCheck className="h-4 w-4 mr-2" />
            Tâches du jour ({todayTasks.length})
          </TabsTrigger>
          <TabsTrigger value="sequences">
            <ListChecks className="h-4 w-4 mr-2" />
            Séquences ({sequences.length})
          </TabsTrigger>
        </TabsList>

        {/* Today's Tasks Tab */}
        <TabsContent value="today">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{todayTasks.length}</p>
                  <p className="text-xs text-muted-foreground">
                    À faire aujourd&apos;hui
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted/40 ring-1 ring-border/30 flex items-center justify-center">
                  <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingTasks.length}</p>
                  <p className="text-xs text-muted-foreground">À venir</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Complétées</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task List */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                        {task.prospect?.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {task.prospect?.name || "Prospect inconnu"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getScheduleColor(task.scheduled_at)}`}
                          >
                            {getScheduleLabel(task.scheduled_at)}
                          </Badge>
                          <span>&middot;</span>
                          <span className="capitalize">{task.action}</span>
                          {task.sequence && (
                            <>
                              <span>&middot;</span>
                              <span>{task.sequence.name}</span>
                            </>
                          )}
                        </div>
                        {task.message_template && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {task.message_template}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCompleteTask(task.id)}
                      disabled={isPending}
                      className="bg-brand text-brand-dark hover:bg-brand/90"
                    >
                      {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                      )}
                      Fait
                    </Button>
                  </div>
                ))}
                {todayTasks.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="font-medium text-sm">Aucune tâche pour aujourd&apos;hui</p>
                    <p className="text-xs mt-1">Bravo, tout est à jour !</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming tasks */}
          {upcomingTasks.length > 0 && (
            <>
              <h3 className="text-sm font-medium text-muted-foreground mt-6 mb-3">
                À venir
              </h3>
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {upcomingTasks.slice(0, 10).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 opacity-70"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold">
                            {task.prospect?.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {task.prospect?.name || "Prospect inconnu"}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                {format(new Date(task.scheduled_at), "d MMMM", {
                                  locale: fr,
                                })}
                              </span>
                              <span>&middot;</span>
                              <span className="capitalize">{task.action}</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getScheduleLabel(task.scheduled_at)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Sequences Tab */}
        <TabsContent value="sequences">
          {sequences.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center text-muted-foreground">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <ListChecks className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="font-medium text-sm">Aucune séquence créée</p>
                <p className="text-xs mt-1">Commencez par en créer une !</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sequences.map((seq) => (
                <Card key={seq.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{seq.name}</CardTitle>
                      <Badge variant="outline">
                        {seq.steps.length} étape{seq.steps.length > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 flex-wrap">
                      {(seq.steps as SequenceStep[])
                        .sort((a, b) => a.step_order - b.step_order)
                        .map((step, i) => (
                          <div key={step.id} className="flex items-center gap-2">
                            <div className="border rounded-lg px-3 py-2 text-sm">
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-brand/10"
                                >
                                  J+{step.day_offset}
                                </Badge>
                                <span className="capitalize font-medium">
                                  {step.action}
                                </span>
                              </div>
                              {step.message_template && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-[200px]">
                                  {step.message_template}
                                </p>
                              )}
                            </div>
                            {i < seq.steps.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
