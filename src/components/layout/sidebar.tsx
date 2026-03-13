"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, PanelLeftClose, PanelLeft, Settings, UserCircle } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/constants";
import type { UserRole } from "@/lib/types/database";
import { useUIStore } from "@/stores/ui-store";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
}

export function Sidebar({ role, userName, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed: isCollapsed,
    toggleSidebar,
    sidebarMobileOpen,
    setMobileSidebarOpen,
  } = useUIStore();

  function closeMobile() {
    setMobileSidebarOpen(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie = "x-user-role=; path=/; max-age=0";
    document.cookie = "x-onboarding-done=; path=/; max-age=0";
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "z-30 flex h-dvh flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          "fixed left-0 top-0",
          "md:static",
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          "w-[75vw] max-w-64 shrink-0 md:w-64 md:max-w-none",
          isCollapsed && "md:w-[72px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border px-4",
            isCollapsed ? "md:justify-center md:px-0" : ""
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5",
              isCollapsed && "md:justify-center"
            )}
            onClick={closeMobile}
          >
            <Image
              src="/logo.png"
              alt="Sales System"
              width={32}
              height={32}
              className="shrink-0"
            />
            {!isCollapsed && (
              <span className="font-serif text-lg font-bold text-white whitespace-nowrap">
                Sales<span className="text-brand">System</span>
              </span>
            )}
          </Link>
        </div>

        {/* Navigation with sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter((item) =>
              item.roles.includes(role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx}>
                {/* Section divider & label */}
                {sIdx > 0 && (
                  <div className="mx-2 mt-4 mb-2 border-t border-sidebar-border" />
                )}
                {section.label && !isCollapsed && (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                    {section.label}
                  </p>
                )}

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname === item.href ||
                          pathname.startsWith(item.href + "/");

                    const linkContent = (
                      <Link
                        href={item.href}
                        onClick={closeMobile}
                        className={cn(
                          "group relative flex items-center rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                          isActive
                            ? "bg-sidebar-accent text-brand"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                          isCollapsed && "md:justify-center md:px-0"
                        )}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand shadow-[0_0_8px_rgba(122,241,122,0.4)]" />
                        )}

                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-all duration-200",
                            isCollapsed ? "" : "mr-3",
                            isActive &&
                              "drop-shadow-[0_0_6px_rgba(122,241,122,0.3)]"
                          )}
                        />
                        <span className={cn(isCollapsed && "md:hidden")}>
                          {item.label}
                        </span>
                      </Link>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-sidebar text-white border-sidebar-border"
                          >
                            {item.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return <div key={item.href}>{linkContent}</div>;
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-sidebar-border px-3 py-3 md:block">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            title={isCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span className="ml-3">Réduire</span>
              </>
            )}
          </button>
        </div>

        {/* User profile */}
        <div className="border-t border-sidebar-border px-3 py-4">
          <div
            className={cn(
              "flex items-center rounded-xl px-3 py-2.5",
              isCollapsed && "md:justify-center md:px-0"
            )}
          >
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-brand/10"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand ring-2 ring-brand/10">
                  {getInitials(userName)}
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
            </div>
            <div
              className={cn(
                "ml-3 min-w-0 flex-1",
                isCollapsed && "md:hidden"
              )}
            >
              <p className="truncate text-sm font-semibold text-white">
                {userName}
              </p>
              <p className="truncate text-xs text-sidebar-foreground/50 capitalize">
                {role.replace("_", " ")}
              </p>
            </div>
          </div>

          {/* Settings (admin/manager) */}
          {(role === "admin" || role === "manager") && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  onClick={closeMobile}
                  className={cn(
                    "mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm transition-all duration-200",
                    pathname.startsWith("/settings")
                      ? "bg-sidebar-accent text-brand"
                      : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isCollapsed && "md:justify-center md:px-0"
                  )}
                >
                  <Settings
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isCollapsed ? "" : "mr-3"
                    )}
                  />
                  <span className={cn(isCollapsed && "md:hidden")}>
                    Paramètres
                  </span>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  className="bg-sidebar text-white border-sidebar-border"
                >
                  Paramètres
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* Profile (non-admin roles) */}
          {!["admin", "manager"].includes(role) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/profile"
                  onClick={closeMobile}
                  className={cn(
                    "mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm transition-all duration-200",
                    pathname === "/profile"
                      ? "bg-sidebar-accent text-brand"
                      : "text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    isCollapsed && "md:justify-center md:px-0"
                  )}
                >
                  <UserCircle
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isCollapsed ? "" : "mr-3"
                    )}
                  />
                  <span className={cn(isCollapsed && "md:hidden")}>Profil</span>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  className="bg-sidebar text-white border-sidebar-border"
                >
                  Profil
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* Sign out */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className={cn(
                  "mt-1 flex w-full items-center rounded-xl px-3 py-2 text-sm text-sidebar-foreground/50 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400",
                  isCollapsed && "md:justify-center md:px-0"
                )}
              >
                <LogOut
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isCollapsed ? "" : "mr-3"
                  )}
                />
                <span className={cn(isCollapsed && "md:hidden")}>
                  Déconnexion
                </span>
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent
                side="right"
                className="bg-sidebar text-white border-sidebar-border"
              >
                Déconnexion
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
