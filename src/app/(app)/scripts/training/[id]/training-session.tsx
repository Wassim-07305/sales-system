"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Brain,
  Timer,
  Target,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { saveTrainingResult } from "@/lib/actions/scripts-v2";

// ---------------------
// Types
// ---------------------

interface ScriptNode {
  id: string;
  type?: string;
  data?: { label?: string; type?: string; content?: string };
  position?: { x: number; y: number };
}

interface ScriptEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface Script {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  nodes: ScriptNode[];
  edges: ScriptEdge[];
}

interface TrainingResult {
  id: string;
  score: number;
  duration: number;
  created_at: string;
}

interface QuizQuestion {
  nodeId: string;
  prompt: string;
  correctAnswer: string;
  options: string[];
  nodeType: string;
}

// ---------------------
// Helpers
// ---------------------

function buildQuiz(nodes: ScriptNode[], edges: ScriptEdge[]): QuizQuestion[] {
  // Order nodes by following edges from the first node (topological sort)
  const orderedNodes = orderNodesByFlow(nodes, edges);

  // Build questions from each node
  const allLabels = orderedNodes.map(
    (n) => n.data?.label || "Sans titre"
  );

  return orderedNodes.map((node, idx) => {
    const label = node.data?.label || "Sans titre";
    const nodeType = node.data?.type || node.type || "étape";

    // Build prompt based on node type and position
    let prompt: string;
    if (idx === 0) {
      prompt = "Quelle est la première étape du script ?";
    } else {
      const prevNode = orderedNodes[idx - 1];
      const prevLabel = prevNode?.data?.label || "l'étape précédente";
      prompt = `Après « ${prevLabel} », quelle est l'étape suivante ?`;
    }

    // Generate distractors from other nodes
    const distractors = allLabels
      .filter((l) => l !== label)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    // Combine correct answer with distractors and shuffle
    const options = [label, ...distractors].sort(() => Math.random() - 0.5);

    return {
      nodeId: node.id,
      prompt,
      correctAnswer: label,
      options,
      nodeType,
    };
  });
}

function orderNodesByFlow(nodes: ScriptNode[], edges: ScriptEdge[]): ScriptNode[] {
  if (nodes.length === 0) return [];

  // Build adjacency map
  const childMap = new Map<string, string[]>();
  const parentSet = new Set<string>();
  edges.forEach((e) => {
    const children = childMap.get(e.source) || [];
    children.push(e.target);
    childMap.set(e.source, children);
    parentSet.add(e.target);
  });

  // Find root nodes (no incoming edges)
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const roots = nodes.filter((n) => !parentSet.has(n.id));
  const startNode = roots.length > 0 ? roots[0] : nodes[0];

  // BFS traversal
  const visited = new Set<string>();
  const ordered: ScriptNode[] = [];
  const queue = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (node) ordered.push(node);

    const children = childMap.get(currentId) || [];
    children.forEach((childId) => {
      if (!visited.has(childId)) queue.push(childId);
    });
  }

  // Add any remaining unvisited nodes
  nodes.forEach((n) => {
    if (!visited.has(n.id)) ordered.push(n);
  });

  return ordered;
}

function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    opening: "Accroche",
    question: "Question",
    objection: "Objection",
    closing: "Closing",
    response: "Réponse",
    transition: "Transition",
  };
  return labels[type] || "Étape";
}

// ---------------------
// Component
// ---------------------

type Phase = "ready" | "quiz" | "results";

export function TrainingSession({
  script,
  history,
}: {
  script: Script;
  history: TrainingResult[];
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("ready");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [showFeedback, setShowFeedback] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nodes = (script.nodes || []) as ScriptNode[];
  const edges = (script.edges || []) as ScriptEdge[];

  const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.score)) : null;

  // Timer
  useEffect(() => {
    if (phase === "quiz") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startTraining = useCallback(() => {
    const quiz = buildQuiz(nodes, edges);
    setQuestions(quiz);
    setCurrentIndex(0);
    setAnswers(new Map());
    setShowFeedback(false);
    setElapsedSeconds(0);
    setPhase("quiz");
  }, [nodes, edges]);

  const handleAnswer = useCallback(
    (option: string) => {
      if (showFeedback) return;
      setAnswers((prev) => new Map(prev).set(currentIndex, option));
      setShowFeedback(true);
    },
    [currentIndex, showFeedback]
  );

  const handleNext = useCallback(() => {
    setShowFeedback(false);
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // End quiz
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("results");
    }
  }, [currentIndex, questions.length]);

  // Compute results
  const correctCount = Array.from(answers.entries()).filter(
    ([idx, answer]) => questions[idx]?.correctAnswer === answer
  ).length;
  const totalQuestions = questions.length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const missedNodes = Array.from(answers.entries())
    .filter(([idx, answer]) => questions[idx]?.correctAnswer !== answer)
    .map(([idx]) => questions[idx]?.nodeId)
    .filter(Boolean);

  const handleSaveAndFinish = useCallback(async () => {
    setSaving(true);
    try {
      let feedback: string;
      if (scorePercent >= 80) {
        feedback = "Excellent ! Vous maîtrisez bien ce script.";
      } else if (scorePercent >= 50) {
        feedback = "Pas mal ! Quelques points à revoir.";
      } else {
        feedback = "Continuez à vous entraîner pour progresser.";
      }

      await saveTrainingResult(script.id, {
        score: scorePercent,
        duration: elapsedSeconds,
        missedNodes,
        feedback,
      });
      toast.success("Résultat sauvegardé", {
        style: { background: "#14080e", border: "1px solid rgba(255,255,255,0.1)" },
      });
      router.refresh();
    } catch {
      toast.error("Erreur lors de la sauvegarde", {
        style: { background: "#14080e", border: "1px solid rgba(255,255,255,0.1)" },
      });
    } finally {
      setSaving(false);
    }
  }, [scorePercent, elapsedSeconds, missedNodes, script.id, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // ---------------------
  // Ready Phase
  // ---------------------
  if (phase === "ready") {
    return (
      <div>
        <PageHeader title={script.title} description="Mode entraînement">
          <Link href="/scripts/training">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          </Link>
        </PageHeader>

        <div className="max-w-xl mx-auto">
          <Card className="bg-card border-border/50 hover:shadow-md transition-all">
            <CardHeader className="text-center">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center mb-2">
                <Brain className="h-7 w-7 text-brand" />
              </div>
              <CardTitle className="text-xl">Prêt pour l&apos;entraînement ?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {script.description && (
                <p className="text-sm text-muted-foreground text-center">
                  {script.description}
                </p>
              )}
              <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Brain className="h-4 w-4" />
                  {nodes.length} noeuds
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="h-4 w-4" />
                  {nodes.length} questions
                </span>
                {bestScore !== null && (
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-brand" />
                    Record : {bestScore}%
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Parcourez le script noeud par noeud. Pour chaque étape, choisissez la bonne
                réponse parmi les options proposées.
              </p>
              <div className="flex justify-center pt-2">
                <Button
                  onClick={startTraining}
                  className="bg-brand text-brand-dark hover:bg-brand/90 px-8"
                >
                  Commencer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------------------
  // Quiz Phase
  // ---------------------
  if (phase === "quiz" && questions.length > 0) {
    const question = questions[currentIndex];
    const selectedAnswer = answers.get(currentIndex);
    const isCorrect = selectedAnswer === question.correctAnswer;
    const progressPercent = ((currentIndex + (showFeedback ? 1 : 0)) / totalQuestions) * 100;

    return (
      <div>
        <PageHeader title={script.title} description="Entraînement en cours">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              {formatTime(elapsedSeconds)}
            </div>
            <Badge variant="outline" className="border-border/50 text-[11px] font-medium uppercase tracking-wider">
              {currentIndex + 1} / {totalQuestions}
            </Badge>
          </div>
        </PageHeader>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-card border-border/50 hover:shadow-md transition-all">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-brand/10 text-brand border-brand/20 text-[11px] font-medium uppercase tracking-wider">
                  {getNodeTypeLabel(question.nodeType)}
                </Badge>
              </div>
              <CardTitle className="text-lg">{question.prompt}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.options.map((option, optIdx) => {
                let optionStyle =
                  "border-border/50 hover:border-brand/40 hover:bg-brand/5 cursor-pointer";

                if (showFeedback) {
                  if (option === question.correctAnswer) {
                    optionStyle =
                      "border-brand/60 bg-brand/10 cursor-default";
                  } else if (option === selectedAnswer && !isCorrect) {
                    optionStyle =
                      "border-foreground/40 bg-foreground/5 cursor-default";
                  } else {
                    optionStyle = "border-border opacity-50 cursor-default";
                  }
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleAnswer(option)}
                    disabled={showFeedback}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${optionStyle}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{option}</span>
                      {showFeedback && option === question.correctAnswer && (
                        <CheckCircle className="h-5 w-5 text-brand shrink-0" />
                      )}
                      {showFeedback &&
                        option === selectedAnswer &&
                        !isCorrect && (
                          <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                    </div>
                  </button>
                );
              })}

              {showFeedback && (
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleNext}
                    className="bg-brand text-brand-dark hover:bg-brand/90"
                  >
                    {currentIndex < totalQuestions - 1 ? (
                      <>
                        Suivant
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    ) : (
                      "Voir les résultats"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------------------
  // Results Phase
  // ---------------------
  return (
    <div>
      <PageHeader title="Résultats" description={script.title}>
        <Link href="/scripts/training">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </PageHeader>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Score Card */}
        <Card className="bg-card border-border/50 hover:shadow-md transition-all">
          <CardContent className="pt-8 pb-8 text-center">
            <div
              className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ring-1 ${
                scorePercent >= 80
                  ? "bg-brand/10 ring-brand/20"
                  : scorePercent >= 50
                  ? "bg-muted/60 ring-muted-foreground/20"
                  : "bg-muted/40 ring-muted-foreground/20"
              }`}
            >
              {scorePercent >= 80 ? (
                <Trophy className="h-8 w-8 text-brand" />
              ) : scorePercent >= 50 ? (
                <Target className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Brain className="h-8 w-8 text-muted-foreground/60" />
              )}
            </div>
            <p className="text-5xl font-bold mb-2">{scorePercent}%</p>
            <p className="text-muted-foreground">
              {correctCount} / {totalQuestions} réponses correctes
            </p>
            <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Timer className="h-4 w-4" />
                {formatTime(elapsedSeconds)}
              </span>
              {bestScore !== null && scorePercent > bestScore && (
                <Badge className="bg-brand/10 text-brand border-brand/20">
                  Nouveau record !
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Answers */}
        <Card className="bg-card border-border/50 hover:shadow-md transition-all">
          <CardHeader>
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Détail des réponses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {questions.map((q, idx) => {
              const userAnswer = answers.get(idx);
              const correct = userAnswer === q.correctAnswer;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    correct
                      ? "border-brand/20 bg-brand/5"
                      : "border-muted-foreground/20 bg-muted/30"
                  }`}
                >
                  {correct ? (
                    <CheckCircle className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{q.prompt}</p>
                    {correct ? (
                      <p className="text-xs text-brand mt-1">
                        {q.correctAnswer}
                      </p>
                    ) : (
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground">
                          Votre réponse : {userAnswer}
                        </p>
                        <p className="text-xs text-brand">
                          Bonne réponse : {q.correctAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            onClick={startTraining}
            className="border-border/50"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
          <Button
            onClick={handleSaveAndFinish}
            disabled={saving}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            {saving ? "Sauvegarde..." : "Sauvegarder le résultat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
