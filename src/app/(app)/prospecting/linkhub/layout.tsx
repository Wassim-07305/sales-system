"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Linkedin,
  Instagram,
  Circle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUnipileStatus } from "@/lib/actions/unipile";

const TABS = [
  { label: "LinkedIn", href: "/prospecting/linkhub", icon: Linkedin, exact: true },
  { label: "Instagram", href: "/prospecting/linkhub/instagram", icon: Instagram },
];

export default function LinkhubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);

  useEffect(() => {
    getUnipileStatus().then((status) => {
      if (status.configured) {
        setConnectedAccounts(
          status.accounts.map((a) => a.channel.toLowerCase()),
        );
      }
    });
  }, []);

  function isActive(tab: (typeof TABS)[number]) {
    if (tab.exact) return pathname === tab.href;
    return pathname.startsWith(tab.href);
  }

  const linkedinConnected = connectedAccounts.includes("linkedin");
  const instagramConnected = connectedAccounts.includes("instagram");

  return (
    <div className="space-y-4">
      {/* Tab bar + connection status */}
      <div className="flex items-center justify-between gap-4 border-b border-border/30 pb-1">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors",
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Connection indicators */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Linkedin className="h-3 w-3" />
            <Circle
              className={cn(
                "h-1.5 w-1.5",
                linkedinConnected
                  ? "fill-brand text-brand"
                  : "fill-muted-foreground/30 text-muted-foreground/30",
              )}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Instagram className="h-3 w-3" />
            <Circle
              className={cn(
                "h-1.5 w-1.5",
                instagramConnected
                  ? "fill-brand text-brand"
                  : "fill-muted-foreground/30 text-muted-foreground/30",
              )}
            />
          </div>
          <Link
            href="/settings/integrations"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Tab content */}
      {children}
    </div>
  );
}
