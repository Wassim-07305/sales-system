"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, StickyNote, Plus, Trash2, Check } from "lucide-react";
import { saveSessionNote, getSessionNote } from "@/lib/actions/live";
import { toast } from "sonner";

const TEMPLATES = {
  coaching: `## Session Coaching\n\n### Points abordes\n- \n\n### Forces observees\n- \n\n### Axes d'amelioration\n- \n\n### Prochaines etapes\n- `,
  decouverte: `## Appel Découverte\n\n### Situation actuelle\n- \n\n### Problemes identifies\n- \n\n### Budget / Timeline\n- \n\n### Decision maker\n- \n\n### Prochaine action\n- `,
  suivi: `## Suivi Client\n\n### Resultats depuis dernier appel\n- \n\n### Nouveaux objectifs\n- \n\n### Obstacles\n- \n\n### Actions a prendre\n- `,
};

interface ActionItem {
  text: string;
  done: boolean;
}

interface SessionNotesPanelProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionNotesPanel({
  sessionId,
  onClose,
}: SessionNotesPanelProps) {
  const [content, setContent] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [newAction, setNewAction] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef(content);
  const actionItemsRef = useRef(actionItems);
  contentRef.current = content;
  actionItemsRef.current = actionItems;

  // Load existing note
  useEffect(() => {
    async function load() {
      try {
        const note = await getSessionNote(sessionId);
        if (note) {
          setContent(note.content);
          setActionItems(note.action_items as ActionItem[]);
        }
      } catch {
        // No existing note
      }
      setLoaded(true);
    }
    load();
  }, [sessionId]);

  // Auto-save every 30s
  useEffect(() => {
    if (!loaded) return;

    const interval = setInterval(async () => {
      try {
        setSaving(true);
        await saveSessionNote({
          session_id: sessionId,
          content: contentRef.current,
          action_items: actionItemsRef.current,
        });
      } catch {
        // Silent fail
      } finally {
        setSaving(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [sessionId, loaded]);

  // Save on close
  const handleClose = useCallback(async () => {
    try {
      await saveSessionNote({
        session_id: sessionId,
        content: contentRef.current,
        action_items: actionItemsRef.current,
      });
      toast.success("Notes sauvegardees");
    } catch {
      // Silent
    }
    onClose();
  }, [sessionId, onClose]);

  const applyTemplate = (key: keyof typeof TEMPLATES) => {
    if (
      content.trim() &&
      !confirm("Remplacer le contenu actuel par le template ?")
    )
      return;
    setContent(TEMPLATES[key]);
  };

  const addActionItem = () => {
    if (!newAction.trim()) return;
    setActionItems((prev) => [
      ...prev,
      { text: newAction.trim(), done: false },
    ]);
    setNewAction("");
  };

  const toggleActionItem = (index: number) => {
    setActionItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item,
      ),
    );
  };

  const removeActionItem = (index: number) => {
    setActionItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-80 flex flex-col bg-card border-l border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Notes</h3>
          {saving && (
            <span className="text-[10px] text-muted-foreground">
              Sauvegarde...
            </span>
          )}
        </div>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Templates */}
      <div className="flex gap-1.5 px-3 py-2 border-b border-border">
        {(Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).map(
          (key) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              className="px-2.5 py-1 rounded-lg bg-muted text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors capitalize"
            >
              {key}
            </button>
          ),
        )}
      </div>

      {/* Note content */}
      <div className="flex-1 overflow-y-auto">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Prenez vos notes ici..."
          className="w-full h-[45%] resize-none bg-transparent text-sm text-foreground/80 placeholder:text-muted-foreground/60 p-3 focus:outline-none"
        />

        {/* Action items */}
        <div className="px-3 pb-3">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Actions
          </h4>

          <div className="space-y-1.5">
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <button
                  onClick={() => toggleActionItem(i)}
                  className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                    item.done
                      ? "bg-[#7af17a]/20 border-[#7af17a]/50 text-[#7af17a]"
                      : "border-muted-foreground/60 hover:border-muted-foreground"
                  }`}
                >
                  {item.done && <Check className="w-3 h-3" />}
                </button>
                <span
                  className={`text-sm flex-1 ${
                    item.done
                      ? "text-muted-foreground/60 line-through"
                      : "text-foreground/80"
                  }`}
                >
                  {item.text}
                </span>
                <button
                  onClick={() => removeActionItem(i)}
                  className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Add action */}
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addActionItem();
                }
              }}
              placeholder="Nouvelle action..."
              className="flex-1 h-8 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[#7af17a]/50"
            />
            <button
              onClick={addActionItem}
              disabled={!newAction.trim()}
              className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:text-foreground hover:bg-muted/80 transition-colors disabled:opacity-30"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
