"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import type { UserRole } from "@/lib/types/database";
import { MoreHorizontal, X } from "lucide-react";

interface MobileNavProps {
  role: UserRole;
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  const filteredItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const mainItems = filteredItems.slice(0, 4);
  const overflowItems = filteredItems.slice(4);

  return (
    <>
      {/* Overflow menu */}
      {showMore && (
        <div className="dark fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-16 left-0 right-0 bg-[#0a0a0a] border-t border-white/[0.06] rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto mb-safe shadow-2xl">
            <div className="grid grid-cols-4 gap-2">
              {overflowItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl text-[11px] font-medium transition-colors",
                      isActive
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-zinc-500 hover:bg-white/[0.04]",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate w-full text-center">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="dark fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.06] bg-[#050505]/95 backdrop-blur-xl md:hidden pb-safe">
        <div className="flex h-16 items-center justify-around">
          {mainItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1.5 text-[10px] font-medium transition-all duration-200 rounded-xl active:scale-95",
                  isActive ? "text-emerald-400" : "text-zinc-600",
                )}
              >
                {isActive && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-emerald-500" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "text-emerald-400",
                  )}
                />
                <span className="truncate max-w-[56px]">{item.label}</span>
              </Link>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1.5 text-[10px] font-medium transition-colors rounded-lg active:bg-white/[0.04]",
                showMore ? "text-emerald-400" : "text-zinc-600",
              )}
            >
              {showMore ? (
                <X className="h-5 w-5" />
              ) : (
                <MoreHorizontal className="h-5 w-5" />
              )}
              <span>Plus</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
