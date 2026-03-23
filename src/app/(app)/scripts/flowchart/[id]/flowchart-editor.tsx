"use client";

import { useCallback, useEffect, useState, useTransition, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type OnConnect,
  type NodeTypes,
  type NodeProps,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Save,
  Loader2,
  MessageSquare,
  HelpCircle,
  ShieldAlert,
  Reply,
  CheckCircle,
  Presentation,
  Share2,
  Users,
  Pencil,
  Copy,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { updateFlowchart } from "@/lib/actions/scripts-v2";
import { ShareDialog } from "../../share-dialog";
import { usePresence } from "@/lib/hooks/use-presence";
import { useRealtimeSync } from "@/lib/hooks/use-realtime-sync";

interface FlowchartData {
  id: string;
  title: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  category: string | null;
  is_template: boolean;
  created_at: string;
  updated_at: string;
}

const nodeTypeConfig: Record<
  string,
  {
    label: string;
    bg: string;
    border: string;
    text: string;
    icon: typeof MessageSquare;
  }
> = {
  opening: {
    label: "Accroche",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-500",
    icon: MessageSquare,
  },
  question: {
    label: "Question",
    bg: "bg-foreground/10",
    border: "border-foreground/20",
    text: "text-foreground",
    icon: HelpCircle,
  },
  objection: {
    label: "Objection",
    bg: "bg-muted-foreground/10",
    border: "border-muted-foreground/20",
    text: "text-muted-foreground",
    icon: ShieldAlert,
  },
  response: {
    label: "Réponse",
    bg: "bg-muted/60",
    border: "border-muted-foreground/15",
    text: "text-muted-foreground/80",
    icon: Reply,
  },
  closing: {
    label: "Closing",
    bg: "bg-emerald-500/8",
    border: "border-emerald-500/15",
    text: "text-emerald-500/80",
    icon: CheckCircle,
  },
};

function ScriptNodeComponent({ data, id }: NodeProps) {
  const nodeData = data as { label: string; type: string };
  const config = nodeTypeConfig[nodeData.type] || nodeTypeConfig.opening;
  const Icon = config.icon;
  const { setNodes, setEdges, getNodes } = useReactFlow();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(nodeData.label);
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(true);
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuOpen(true);
  }

  function handleDuplicate() {
    const currentNodes = getNodes();
    const sourceNode = currentNodes.find((n) => n.id === id);
    if (!sourceNode) return;
    const newId = `${nodeData.type}-${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: sourceNode.type,
      position: {
        x: sourceNode.position.x + 40,
        y: sourceNode.position.y + 60,
      },
      data: { ...sourceNode.data },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function handleDelete() {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  }

  function handleBlur() {
    setEditing(false);
    if (label.trim() !== nodeData.label) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: { ...n.data, label: label.trim() || nodeData.label },
              }
            : n,
        ),
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setLabel(nodeData.label);
      setEditing(false);
    }
  }

  // Sync if label changes externally
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLabel(nodeData.label);
  }, [nodeData.label]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <DropdownMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
      <DropdownMenuTrigger asChild>
        <div
          className={`px-4 py-3 rounded-xl border shadow-sm min-w-[180px] max-w-[280px] ${config.bg} ${config.border} hover:shadow-lg transition-all duration-300`}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          <Handle
            type="target"
            position={Position.Top}
            className="!bg-gray-400 !w-3 !h-3"
          />
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-3.5 w-3.5 ${config.text}`} />
            <span
              className={`text-[10px] font-medium uppercase tracking-wider ${config.text}`}
            >
              {config.label}
            </span>
          </div>
          {editing ? (
            <textarea
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="nodrag w-full text-sm font-medium text-foreground bg-transparent border border-emerald-500/30 rounded-md px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              rows={Math.max(2, Math.ceil(label.length / 30))}
            />
          ) : (
            <p className="text-sm font-medium text-foreground cursor-text whitespace-pre-wrap">
              {nodeData.label}
            </p>
          )}
          <Handle
            type="source"
            position={Position.Bottom}
            className="!bg-gray-400 !w-3 !h-3"
          />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[160px]">
        <DropdownMenuItem
          onClick={() => {
            setContextMenuOpen(false);
            setEditing(true);
          }}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Dupliquer
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-red-500 focus:text-red-500"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const MemoizedScriptNode = memo(ScriptNodeComponent);

const nodeTypes: NodeTypes = {
  opening: MemoizedScriptNode,
  question: MemoizedScriptNode,
  objection: MemoizedScriptNode,
  response: MemoizedScriptNode,
  closing: MemoizedScriptNode,
};

const categories = [
  { value: "prospection", label: "Prospection" },
  { value: "closing", label: "Closing" },
  { value: "objection", label: "Objection" },
  { value: "relance", label: "Relance" },
  { value: "discovery", label: "Découverte" },
];

interface FlowchartEditorProps {
  flowchart: FlowchartData;
  userId?: string;
  userName?: string;
}

export function FlowchartEditor({
  flowchart,
  userId,
  userName,
}: FlowchartEditorProps) {
  const [title, setTitle] = useState(flowchart.title);
  const [category, setCategory] = useState(flowchart.category || "");
  const [isPending, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);

  // Real-time collaboration presence
  const { onlineUsers } = usePresence(
    userId ? `script:${flowchart.id}` : null,
    userId || "",
    userName || "",
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    (flowchart.nodes as Node[]) || [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (flowchart.edges as Edge[]) || [],
  );

  // Real-time sync of nodes/edges
  const handleRemoteUpdate = useCallback(
    (data: { nodes: Node[]; edges: Edge[] }) => {
      setNodes(data.nodes);
      setEdges(data.edges);
    },
    [setNodes, setEdges],
  );

  const { broadcastChanges } = useRealtimeSync({
    scriptId: userId ? flowchart.id : null,
    userId: userId || "",
    onRemoteUpdate: handleRemoteUpdate,
  });

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
  );

  function handleSave() {
    startTransition(async () => {
      try {
        await updateFlowchart(flowchart.id, {
          title,
          nodes,
          edges,
          category: category || undefined,
        });
        broadcastChanges(nodes, edges);
      } catch {
        toast.error("Erreur lors de la sauvegarde du flowchart");
      }
    });
  }

  const addNode = useCallback(
    (type: string) => {
      const id = `${type}-${Date.now()}`;
      const config = nodeTypeConfig[type];
      const newNode: Node = {
        id,
        type,
        position: {
          x: 250 + Math.random() * 200 - 100,
          y: 100 + nodes.length * 120,
        },
        data: { label: config.label, type },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes],
  );

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background">
        <Link href="/scripts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
        </Link>

        <div className="h-6 w-px bg-border" />

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-[250px] h-9 text-xs font-medium"
          placeholder="Titre du flowchart"
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* Online collaborators */}
        {onlineUsers.length > 0 && (
          <div className="flex items-center gap-1.5 mr-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 3).map((u) => (
                <div
                  key={u.userId}
                  className="h-6 w-6 rounded-full bg-emerald-500/20 border-2 border-background flex items-center justify-center"
                  title={u.userName}
                >
                  <span className="text-[10px] font-semibold text-emerald-500">
                    {u.userName.charAt(0).toUpperCase()}
                  </span>
                </div>
              ))}
              {onlineUsers.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-[10px] font-medium">
                    +{onlineUsers.length - 3}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4 mr-1" />
          Partager
        </Button>

        <Link href={`/scripts/present/${flowchart.id}`}>
          <Button variant="outline" size="sm">
            <Presentation className="h-4 w-4 mr-1" />
            Présenter
          </Button>
        </Link>

        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="bg-emerald-500 text-black hover:bg-emerald-400"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Sauvegarder
        </Button>
      </div>

      <ShareDialog
        scriptId={flowchart.id}
        scriptType="flowchart"
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-background !border !shadow-sm"
          />

          {/* Add Node Panel */}
          <Panel position="top-left">
            <div className="bg-background border border-border/50 rounded-lg shadow-sm p-3 space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Ajouter un noeud
              </p>
              {Object.entries(nodeTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => addNode(type)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-200 hover:shadow-md ${config.bg} ${config.border} ${config.text}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
