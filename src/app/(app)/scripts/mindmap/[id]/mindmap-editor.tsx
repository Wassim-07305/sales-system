"use client";

import { useCallback, useState, useTransition, useRef, memo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2, Plus, Share2, Users } from "lucide-react";
import Link from "next/link";
import { updateMindMap } from "@/lib/actions/scripts-v2";
import { ShareDialog } from "../../share-dialog";
import { usePresence } from "@/lib/hooks/use-presence";
import { useRealtimeSync } from "@/lib/hooks/use-realtime-sync";

interface MindMapData {
  id: string;
  title: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  category: string | null;
  created_at: string;
  updated_at: string;
}

const branchColors = [
  { bg: "bg-emerald-500/10", border: "border-emerald-500", text: "text-emerald-500" },
  {
    bg: "bg-foreground/10",
    border: "border-foreground/40",
    text: "text-foreground",
  },
  {
    bg: "bg-muted-foreground/10",
    border: "border-muted-foreground/40",
    text: "text-muted-foreground",
  },
  {
    bg: "bg-muted/60",
    border: "border-muted-foreground/30",
    text: "text-muted-foreground/80",
  },
  { bg: "bg-emerald-500/8", border: "border-emerald-500/60", text: "text-emerald-500/80" },
  {
    bg: "bg-foreground/8",
    border: "border-foreground/30",
    text: "text-foreground/80",
  },
  {
    bg: "bg-muted-foreground/8",
    border: "border-muted-foreground/30",
    text: "text-muted-foreground/70",
  },
  {
    bg: "bg-muted/40",
    border: "border-border",
    text: "text-muted-foreground/60",
  },
];

function RootNodeComponent({ data }: NodeProps) {
  const nodeData = data as { label: string; type: string };
  return (
    <div className="px-6 py-4 rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 shadow-md min-w-[200px] text-center">
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-brand !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!bg-brand !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="!bg-brand !w-3 !h-3"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-brand !w-3 !h-3"
      />
      <p className="text-base font-bold text-black">{nodeData.label}</p>
    </div>
  );
}

function BranchNodeComponent({ data }: NodeProps) {
  const nodeData = data as { label: string; type: string; colorIndex?: number };
  const colorIdx = (nodeData.colorIndex ?? 0) % branchColors.length;
  const color = branchColors[colorIdx];

  return (
    <div
      className={`px-4 py-2.5 rounded-xl border-2 shadow-sm min-w-[140px] text-center ${color.bg} ${color.border}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !w-2.5 !h-2.5"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!bg-gray-400 !w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-gray-400 !w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!bg-gray-400 !w-2.5 !h-2.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-gray-400 !w-2.5 !h-2.5"
      />
      <p className={`text-sm font-medium ${color.text}`}>{nodeData.label}</p>
    </div>
  );
}

const MemoizedRootNode = memo(RootNodeComponent);
const MemoizedBranchNode = memo(BranchNodeComponent);

const nodeTypes: NodeTypes = {
  root: MemoizedRootNode,
  branch: MemoizedBranchNode,
};

interface MindMapEditorProps {
  mindMap: MindMapData;
  userId?: string;
  userName?: string;
}

export function MindMapEditor({
  mindMap,
  userId,
  userName,
}: MindMapEditorProps) {
  const [title, setTitle] = useState(mindMap.title);
  const [isPending, startTransition] = useTransition();
  const [shareOpen, setShareOpen] = useState(false);

  // Real-time collaboration presence
  const { onlineUsers } = usePresence(
    userId ? `script:${mindMap.id}` : null,
    userId || "",
    userName || "",
  );

  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const branchCountRef = useRef(
    (mindMap.nodes as Node[]).filter(
      (n) => (n.data as { type?: string }).type === "branch",
    ).length,
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(
    (mindMap.nodes as Node[]) || [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    (mindMap.edges as Edge[]) || [],
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges],
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
    scriptId: userId ? mindMap.id : null,
    userId: userId || "",
    onRemoteUpdate: handleRemoteUpdate,
  });

  function handleSave() {
    startTransition(async () => {
      try {
        await updateMindMap(mindMap.id, {
          title,
          nodes,
          edges,
        });
        broadcastChanges(nodes, edges);
      } catch {
        // Silently fail
      }
    });
  }

  function addBranch() {
    const count = branchCountRef.current;
    branchCountRef.current += 1;
    const id = `branch-${Date.now()}`;

    // Calculate position around the root node in a radial layout
    const angle = (count * (Math.PI * 2)) / 8 + Math.PI / 4;
    const radius = 250;
    const rootNode = nodes.find(
      (n) => (n.data as { type?: string }).type === "root",
    );
    const centerX = rootNode?.position.x ?? 400;
    const centerY = rootNode?.position.y ?? 300;

    const newNode: Node = {
      id,
      type: "branch",
      position: {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      },
      data: { label: "Nouvelle branche", type: "branch", colorIndex: count },
    };

    const newEdge: Edge = {
      id: `e-root-${id}`,
      source: "root",
      target: id,
      type: "default",
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  }

  function handleNodeDoubleClick(_event: React.MouseEvent, node: Node) {
    setEditingNodeId(node.id);
    setEditingLabel((node.data as { label: string }).label);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  function confirmEdit() {
    if (editingNodeId && editingLabel.trim()) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === editingNodeId
            ? { ...n, data: { ...n.data, label: editingLabel.trim() } }
            : n,
        ),
      );
    }
    setEditingNodeId(null);
    setEditingLabel("");
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      confirmEdit();
    } else if (e.key === "Escape") {
      setEditingNodeId(null);
      setEditingLabel("");
    }
  }

  return (
    <div className="h-[calc(100dvh-180px)] md:h-[calc(100dvh-120px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
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
          className="max-w-[250px] h-8 text-sm font-medium"
          placeholder="Titre de la mind map"
        />

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
        scriptId={mindMap.id}
        scriptType="mindmap"
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
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

          {/* Add Branch Panel */}
          <Panel position="top-left">
            <div className="bg-background border rounded-lg shadow-sm p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Outils
              </p>
              <button
                onClick={addBranch}
                className="flex items-center gap-2 w-full px-3 py-1.5 rounded text-xs font-medium border transition-colors hover:bg-emerald-500/10 border-emerald-500 text-emerald-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter branche
              </button>
              <p className="text-[10px] text-muted-foreground mt-2">
                Double-cliquez sur un noeud pour modifier son texte
              </p>
            </div>
          </Panel>
        </ReactFlow>

        {/* Inline edit overlay */}
        {editingNodeId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-lg shadow-lg p-3 flex items-center gap-2">
            <Input
              ref={editInputRef}
              value={editingLabel}
              onChange={(e) => setEditingLabel(e.target.value)}
              onKeyDown={handleEditKeyDown}
              onBlur={confirmEdit}
              className="h-8 text-sm w-[200px]"
              placeholder="Texte du noeud"
            />
            <Button size="sm" onClick={confirmEdit} className="h-8">
              OK
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
