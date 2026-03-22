"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Search, Clock, Smile, Heart, Coffee, Flag, Hash, Zap, Dog, Car } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Emoji data organized by category ──

const EMOJI_CATEGORIES = [
  {
    id: "recent",
    label: "Récents",
    icon: Clock,
    emojis: [] as string[], // filled dynamically
  },
  {
    id: "smileys",
    label: "Smileys",
    icon: Smile,
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃",
      "😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙",
      "🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢",
      "🫣","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥",
      "😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴",
      "😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯",
      "🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁",
      "😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰",
      "😥","😢","😭","😱","😖","😣","😞","😓","😩","😫",
      "🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩",
      "🤡","👹","👺","👻","👽","👾","🤖",
    ],
  },
  {
    id: "gestures",
    label: "Gestes",
    icon: Zap,
    emojis: [
      "👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌",
      "🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉",
      "👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛",
      "🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅",
      "🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🧠",
      "🫀","🫁","🦷","🦴","👀","👁️","👅","👄","🫦",
    ],
  },
  {
    id: "hearts",
    label: "Coeurs",
    icon: Heart,
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
      "❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝",
      "💟","♥️","🩷","🩵","🩶",
    ],
  },
  {
    id: "nature",
    label: "Nature",
    icon: Dog,
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨",
      "🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒",
      "🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗",
      "🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🪰",
      "🌸","🌺","🌻","🌹","🌷","🌼","💐","🪻","🌾","🍀",
      "🍁","🍂","🍃","🌿","☘️","🪴","🌵","🌲","🌳","🌴",
      "🪹","🪺","🍄","🌰","🦀","🐙","🦑","🦐","🐠","🐟",
      "🐡","🐬","🐳","🐋","🦈","🪸","🐊","🐅","🐆","🦓",
      "🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬",
    ],
  },
  {
    id: "food",
    label: "Nourriture",
    icon: Coffee,
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐",
      "🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑",
      "🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🫒","🧄","🧅",
      "🥔","🍠","🫘","🥐","🥖","🍞","🥨","🧀","🥚","🍳",
      "🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟",
      "🍕","🫓","🥪","🌮","🌯","🫔","🥙","🧆","🥗","🍝",
      "🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚",
      "🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧",
      "🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪",
      "🥛","🍼","🫖","☕","🍵","🧃","🥤","🧋","🍶","🍺",
      "🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🫗","🍴",
      "🥄","🔪","🫙","🏺",
    ],
  },
  {
    id: "travel",
    label: "Voyage",
    icon: Car,
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐",
      "🛻","🚚","🚛","🚜","🏍️","🛵","🚲","🛴","🛹","🛼",
      "✈️","🛩️","🚀","🛸","🚁","⛵","🚤","🛥️","🛳️","⛴️",
      "🗺️","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️",
      "🏟️","🏛️","🏗️","🧱","🪨","🪵","🛖","🏘️","🏚️","🏠",
      "🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫",
      "🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕",
      "🕍","⛩️","🕋","⛲","⛺","🌁","🌃","🌆","🌇","🌉",
      "🌌","🎠","🎡","🎢","💈","🎪","🚂","🚃","🚄","🚅",
    ],
  },
  {
    id: "objects",
    label: "Objets",
    icon: Hash,
    emojis: [
      "⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️",
      "💾","💿","📀","📼","📷","📹","🎥","📽️","🎬","📺",
      "📻","🎙️","🎚️","🎛️","🧭","⏱️","⏲️","⏰","🕰️","⌛",
      "📡","🔋","🔌","💡","🔦","🕯️","🧯","🛢️","💵","💴",
      "💶","💷","🪙","💰","💳","💎","⚖️","🪜","🧰","🪛",
      "🔧","🔨","⚒️","🛠️","⛏️","🪚","🔩","⚙️","🪤","🧲",
      "🔫","💣","🧨","🪓","🔪","🗡️","⚔️","🛡️","🚬","⚰️",
      "🏺","🔮","📿","🧿","🪬","💈","⚗️","🔭","🔬","🕳️",
      "🩹","🩺","🩻","💊","💉","🩸","🧬","🦠","🧫","🧪",
      "🌡️","🧹","🪠","🧺","🧻","🚽","🚿","🛁","🪥","🪒",
      "🧽","🪣","🧴","🛎️","🔑","🗝️","🚪","🪑","🛋️","🛏️",
      "🛌","🧸","🪆","🖼️","🪞","🪟","🛍️","🛒","🎁","🎈",
      "🎏","🎀","🪄","🪅","🎊","🎉","🎎","🏮","🎐","🧧",
    ],
  },
  {
    id: "symbols",
    label: "Symboles",
    icon: Flag,
    emojis: [
      "✅","❌","❓","❗","‼️","⁉️","💯","🔥","⭐","🌟",
      "✨","⚡","💥","💫","💦","💨","🕊️","🦅","🏆","🥇",
      "🥈","🥉","🏅","🎖️","🎗️","📣","📢","🔔","🔕","🎵",
      "🎶","🎼","🎤","🎧","📯","🥁","🎹","🎸","🎻","🪕",
      "🎺","🎷","🪗","🪘","⚽","🏀","🏈","⚾","🥎","🎾",
      "🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🥍","🏏",
      "🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽",
      "🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️",
      "➕","➖","➗","✖️","♾️","💲","💱","™️","©️","®️",
      "〰️","➰","➿","🔚","🔙","🔛","🔝","🔜","☑️","🔘",
      "🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺",
      "🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪️","▫️","◾",
      "◽","◼️","◻️","🟥","🟧","🟨","🟩","🟦","🟪","⬛",
      "⬜","🟫",
    ],
  },
];

const RECENT_EMOJIS_KEY = "emoji-recent";
const MAX_RECENT = 24;

function getRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_EMOJIS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmoji(emoji: string) {
  const recent = getRecentEmojis().filter((e) => e !== emoji);
  recent.unshift(emoji);
  const trimmed = recent.slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
  return trimmed;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function EmojiPicker({ onSelect, trigger, side = "top", align = "end" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("smileys");
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (open) {
      setRecentEmojis(getRecentEmojis());
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearch("");
    }
  }, [open]);

  const categories = useMemo(() => {
    const cats = EMOJI_CATEGORIES.map((cat) => {
      if (cat.id === "recent") {
        return { ...cat, emojis: recentEmojis };
      }
      return cat;
    });
    // Hide recent if empty
    return cats.filter((c) => c.id !== "recent" || c.emojis.length > 0);
  }, [recentEmojis]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    // Simple search: filter emojis that visually match common terms
    const allEmojis = categories.flatMap((c) => c.emojis);
    const matched = allEmojis.filter((emoji) => {
      // Match by emoji character (useful for copy-pasted search)
      return emoji.includes(q);
    });
    // If text search, search through all emojis (we can't search by name without a name map)
    // Return a flat list
    if (matched.length > 0) {
      return [{ id: "search", label: "Résultats", icon: Search, emojis: matched }];
    }
    // Fallback: return all emojis in a flat list when search doesn't match
    return categories;
  }, [categories, search]);

  const handleSelect = useCallback(
    (emoji: string) => {
      const updated = saveRecentEmoji(emoji);
      setRecentEmojis(updated);
      onSelect(emoji);
      setOpen(false);
    },
    [onSelect],
  );

  const scrollToCategory = useCallback((catId: string) => {
    setActiveCategory(catId);
    const el = categoryRefs.current[catId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <button
            className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Emoji"
          >
            <Smile className="h-5 w-5" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        className="w-[340px] p-0 overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un emoji..."
              className="w-full h-8 pl-8 pr-3 bg-muted/40 border border-border/30 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Category tabs */}
        {!search.trim() && (
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b overflow-x-auto scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    "rounded-md p-1.5 transition-colors shrink-0",
                    activeCategory === cat.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  title={cat.label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        )}

        {/* Emoji grid */}
        <div
          ref={scrollRef}
          className="h-[280px] overflow-y-auto p-2 space-y-3 scrollbar-thin"
          onScroll={() => {
            // Update active category based on scroll position
            if (search.trim()) return;
            const container = scrollRef.current;
            if (!container) return;
            const scrollTop = container.scrollTop + 20;
            for (const cat of categories) {
              const el = categoryRefs.current[cat.id];
              if (el && el.offsetTop <= scrollTop) {
                setActiveCategory(cat.id);
              }
            }
          }}
        >
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              ref={(el) => { categoryRefs.current[cat.id] = el; }}
            >
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                {cat.label}
              </p>
              <div className="grid grid-cols-9 gap-0.5">
                {cat.emojis.map((emoji, i) => (
                  <button
                    key={`${cat.id}-${i}`}
                    onClick={() => handleSelect(emoji)}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-xl hover:bg-muted transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Inline quick reaction picker (for message hover actions) */
interface QuickReactionPickerProps {
  onSelect: (emoji: string) => void;
  onOpenFull?: () => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "✅", "👀", "🚀"];

export function QuickReactionPicker({ onSelect, onOpenFull }: QuickReactionPickerProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-md">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="rounded p-1 text-sm hover:bg-muted transition-colors hover:scale-110"
        >
          {emoji}
        </button>
      ))}
      {onOpenFull && (
        <button
          onClick={onOpenFull}
          className="rounded p-1 text-sm hover:bg-muted transition-colors text-muted-foreground"
          title="Plus d'emojis"
        >
          <Smile className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
