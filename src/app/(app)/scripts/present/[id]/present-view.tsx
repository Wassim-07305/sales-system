"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  X,
  MessageSquare,
  HelpCircle,
  ShieldAlert,
  Reply,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

interface FlowchartNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string; type: string };
}

interface FlowchartEdge {
  id: string;
  source: string;
  target: string;
}

interface FlowchartData {
  id: string;
  title: string;
  description: string | null;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  category: string | null;
}

const nodeTypeConfig: Record<
  string,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    lightBg: string;
    icon: typeof MessageSquare;
  }
> = {
  opening: {
    label: "Accroche",
    bg: "bg-brand",
    border: "border-brand/20",
    text: "text-brand",
    lightBg: "bg-brand/10",
    icon: MessageSquare,
  },
  question: {
    label: "Question",
    bg: "bg-foreground",
    border: "border-foreground/20",
    text: "text-foreground",
    lightBg: "bg-foreground/10",
    icon: HelpCircle,
  },
  objection: {
    label: "Objection",
    bg: "bg-muted-foreground",
    border: "border-muted-foreground/20",
    text: "text-muted-foreground",
    lightBg: "bg-muted-foreground/10",
    icon: ShieldAlert,
  },
  response: {
    label: "Réponse",
    bg: "bg-muted-foreground/80",
    border: "border-muted-foreground/15",
    text: "text-muted-foreground/80",
    lightBg: "bg-muted/60",
    icon: Reply,
  },
  closing: {
    label: "Closing",
    bg: "bg-brand/80",
    border: "border-brand/15",
    text: "text-brand/80",
    lightBg: "bg-brand/8",
    icon: CheckCircle,
  },
};

export function PresentView({ flowchart }: { flowchart: FlowchartData }) {
  const [currentStep, setCurrentStep] = useState(0);

  // Order nodes by their position (top to bottom, following edges if possible)
  const orderedNodes = useMemo(() => {
    const nodes = flowchart.nodes || [];
    const edges = flowchart.edges || [];

    if (nodes.length === 0) return [];

    // Try to follow edges to order nodes (topological sort)
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach((n) => {
      adjacency.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    edges.forEach((e) => {
      const targets = adjacency.get(e.source);
      if (targets) targets.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    // Kahn's algorithm for topological sort
    const queue: string[] = [];
    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    const sorted: string[] = [];
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      sorted.push(nodeId);
      const neighbors = adjacency.get(nodeId) || [];
      for (const neighbor of neighbors) {
        const newDeg = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDeg);
        if (newDeg === 0) queue.push(neighbor);
      }
    }

    // Add any remaining nodes not in the sorted order
    const sortedSet = new Set(sorted);
    nodes.forEach((n) => {
      if (!sortedSet.has(n.id)) sorted.push(n.id);
    });

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return sorted.map((id) => nodeMap.get(id)!).filter(Boolean);
  }, [flowchart.nodes, flowchart.edges]);

  const currentNode = orderedNodes[currentStep];
  const totalSteps = orderedNodes.length;

  function goNext() {
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  }

  function goPrev() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  if (totalSteps === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark">
        <div className="text-center text-white">
          <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-xl mb-4">Aucun noeud dans ce flowchart</p>
          <Link href={`/scripts/flowchart/${flowchart.id}`}>
            <Button variant="outline">Retour à l&apos;éditeur</Button>
          </Link>
        </div>
      </div>
    );
  }

  const config =
    nodeTypeConfig[currentNode?.data?.type || currentNode?.type || "opening"] ||
    nodeTypeConfig.opening;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <h2 className="text-white/70 text-sm font-medium">
          {flowchart.title}
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-muted/30 border-border/50 text-[11px] font-medium uppercase tracking-wider">
            {currentStep + 1} / {totalSteps}
          </Badge>
          <Link href={`/scripts/flowchart/${flowchart.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4 mr-1" />
              Quitter
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / totalSteps) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {/* Step type badge */}
          <div className="flex justify-center mb-6">
            <Badge
              className={`${config.lightBg} ${config.text} ${config.border} border px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider`}
            >
              <Icon className="h-3.5 w-3.5 mr-2" />
              {config.label}
            </Badge>
          </div>

          {/* Main card */}
          <Card
            className={`border ${config.border} shadow-2xl shadow-black/50 hover:shadow-md transition-all`}
          >
            <CardContent className="p-8 md:p-12">
              <p className="text-xl md:text-2xl font-semibold text-center leading-relaxed">
                {currentNode?.data?.label || "---"}
              </p>
            </CardContent>
          </Card>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {orderedNodes.map((_, idx) => {
              const stepConfig =
                nodeTypeConfig[
                  orderedNodes[idx]?.data?.type ||
                    orderedNodes[idx]?.type ||
                    "opening"
                ] || nodeTypeConfig.opening;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? `w-8 ${stepConfig.bg}`
                      : idx < currentStep
                        ? "w-2.5 bg-brand/60"
                        : "w-2.5 bg-white/20"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-6 py-6">
        <Button
          onClick={goPrev}
          disabled={currentStep === 0}
          variant="ghost"
          size="lg"
          className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Précédent
        </Button>

        <Button
          onClick={goNext}
          disabled={currentStep === totalSteps - 1}
          size="lg"
          className="bg-brand text-brand-dark hover:bg-brand/90 disabled:opacity-30"
        >
          Suivant
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
