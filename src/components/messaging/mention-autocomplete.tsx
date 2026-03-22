"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  setter: "Setter",
  closer: "Closer",
  client_b2b: "Client B2B",
  client_b2c: "Client B2C",
};

export interface MentionUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

interface MentionAutocompleteProps {
  users: MentionUser[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onInsertMention: (user: MentionUser, startPos: number, endPos: number) => void;
}

export function MentionAutocomplete({
  users,
  textareaRef,
  content,
  onInsertMention,
}: MentionAutocompleteProps) {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Detect @ trigger
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleInput = () => {
      const pos = textarea.selectionStart;
      const text = textarea.value;

      // Look backwards from cursor for @
      let atPos = -1;
      for (let i = pos - 1; i >= 0; i--) {
        if (text[i] === "@") {
          // Check that @ is at start or preceded by a space/newline
          if (i === 0 || /[\s\n]/.test(text[i - 1])) {
            atPos = i;
            break;
          }
          break;
        }
        // Stop if we hit a space (means the mention query ended)
        if (text[i] === " " || text[i] === "\n") break;
      }

      if (atPos >= 0) {
        const q = text.slice(atPos + 1, pos);
        setMentionStart(atPos);
        setQuery(q);
        setShow(true);
        setSelectedIndex(0);
      } else {
        setShow(false);
      }
    };

    // Listen for both input and cursor changes
    textarea.addEventListener("input", handleInput);
    textarea.addEventListener("click", handleInput);
    textarea.addEventListener("keyup", handleInput);

    return () => {
      textarea.removeEventListener("input", handleInput);
      textarea.removeEventListener("click", handleInput);
      textarea.removeEventListener("keyup", handleInput);
    };
  }, [textareaRef, content]);

  // Filter users
  const filtered = useMemo(() => {
    if (!show) return [];
    const q = query.toLowerCase();

    // Special mentions
    const specials: MentionUser[] = [];
    if ("tous".startsWith(q) || "channel".startsWith(q)) {
      specials.push({
        id: "__tous__",
        full_name: "tous",
        avatar_url: null,
        role: "Notifier tout le monde",
      });
    }

    const userResults = users
      .filter((u) => u.full_name.toLowerCase().includes(q))
      .slice(0, 8);

    return [...specials, ...userResults];
  }, [show, query, users]);

  // Reset selected index when filtered changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-mention-item]");
    items[selectedIndex]?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!show || filtered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const user = filtered[selectedIndex];
        if (user) {
          const textarea = textareaRef.current;
          const endPos = textarea?.selectionStart ?? mentionStart + 1 + query.length;
          onInsertMention(user, mentionStart, endPos);
          setShow(false);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShow(false);
      }
    },
    [show, filtered, selectedIndex, mentionStart, query, onInsertMention, textareaRef],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.addEventListener("keydown", handleKeyDown, true);
    return () => textarea.removeEventListener("keydown", handleKeyDown, true);
  }, [textareaRef, handleKeyDown]);

  if (!show || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 max-h-[240px] overflow-y-auto rounded-xl border bg-background shadow-lg z-50"
    >
      <div className="p-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2.5 py-1.5">
          Mentionner quelqu&apos;un
        </p>
        {filtered.map((user, i) => (
          <button
            key={user.id}
            data-mention-item
            onClick={() => {
              const textarea = textareaRef.current;
              const endPos = textarea?.selectionStart ?? mentionStart + 1 + query.length;
              onInsertMention(user, mentionStart, endPos);
              setShow(false);
            }}
            className={cn(
              "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
              i === selectedIndex
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted",
            )}
          >
            {user.id === "__tous__" ? (
              <div className="h-7 w-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <span className="text-xs">@</span>
              </div>
            ) : (
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-semibold">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 text-left min-w-0">
              <span className="font-medium truncate block">
                {user.id === "__tous__" ? "@tous" : user.full_name}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground capitalize shrink-0">
              {user.id === "__tous__"
                ? "Tout le monde"
                : ROLE_LABELS[user.role] ?? user.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
