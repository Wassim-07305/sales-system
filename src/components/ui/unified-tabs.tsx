"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface UnifiedTab {
  label: string;
  value: string;
  icon?: LucideIcon;
  /** If provided, tab renders as a <Link> navigating to this href */
  href?: string;
  /** For href-based tabs: true = match pathname exactly, false = startsWith */
  exact?: boolean;
}

interface UnifiedTabsProps {
  tabs: UnifiedTab[];
  /** For controlled (button) tabs — the currently active value */
  active?: string;
  /** For controlled (button) tabs — callback when a tab is clicked */
  onTabChange?: (value: string) => void;
  className?: string;
}

/**
 * Unified tab bar used across the entire app.
 *
 * Two modes:
 * - **Link mode**: tab has `href` → renders as Next.js Link, active state derived from pathname
 * - **Button mode**: tab has no `href` → renders as button, active state from `active` prop
 *
 * Both modes can coexist in the same tab bar.
 */
export function UnifiedTabs({
  tabs,
  active,
  onTabChange,
  className,
}: UnifiedTabsProps) {
  const pathname = usePathname();

  function isActive(tab: UnifiedTab): boolean {
    // Button mode — controlled via `active` prop
    if (!tab.href) return tab.value === active;
    // Link mode — derived from current pathname
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  const activeClass =
    "bg-emerald-500 text-white shadow-sm";
  const inactiveClass =
    "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50";

  return (
    <div className={cn("flex items-center gap-1 overflow-x-auto scrollbar-none", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const tabActive = isActive(tab);

        const inner = (
          <>
            {Icon && <Icon className="h-4 w-4 shrink-0" />}
            <span className="truncate">{tab.label}</span>
          </>
        );

        const sharedClass = cn(
          "flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-lg whitespace-nowrap transition-colors min-w-[100px]",
          tabActive ? activeClass : inactiveClass,
        );

        if (tab.href) {
          return (
            <Link key={tab.value} href={tab.href} className={sharedClass}>
              {inner}
            </Link>
          );
        }

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange?.(tab.value)}
            className={sharedClass}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
