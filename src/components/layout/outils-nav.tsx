"use client";

import Link from "next/link";
import { FileText, GitBranch, Presentation, Zap } from "lucide-react";

const OUTILS_TABS = [
  { label: "Scripts", href: "/scripts", value: "scripts", icon: FileText },
  { label: "Flowcharts", href: "/scripts", value: "flowcharts", icon: GitBranch },
  { label: "Présentation", href: "/genspark", value: "presentation", icon: Presentation },
  { label: "Automatisation", href: "/automation", value: "automation", icon: Zap },
] as const;

export type OutilsTab = (typeof OUTILS_TABS)[number]["value"];

export function OutilsNav({
  active,
  onTabChange,
}: {
  active: OutilsTab;
  onTabChange?: (tab: OutilsTab) => void;
}) {
  return (
    <div className="flex items-center gap-1 px-6 mb-4">
      <div className="inline-flex items-center rounded-lg bg-muted/40 border border-border/50 p-1">
        {OUTILS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.value === active;

          // Scripts and Flowcharts are local tabs on /scripts page
          if (
            (tab.value === "scripts" || tab.value === "flowcharts") &&
            onTabChange
          ) {
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          }

          // For Présentation and Automatisation (always links), or when on those pages
          if (isActive) {
            return (
              <span
                key={tab.value}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background text-foreground shadow-sm rounded-md"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
            );
          }

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
