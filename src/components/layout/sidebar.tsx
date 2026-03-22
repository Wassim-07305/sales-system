"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  PanelLeftClose,
  PanelLeft,
  Settings,
  UserCircle,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/constants";
import type { UserRole } from "@/lib/types/database";
import { useUIStore } from "@/stores/ui-store";
import { useUnreadCounts } from "@/lib/hooks/use-unread-counts";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WhiteLabelConfig } from "@/app/(app)/app-shell";

interface SidebarProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  whiteLabelConfig?: WhiteLabelConfig | null;
}

export function Sidebar({
  role,
  userName,
  avatarUrl,
  whiteLabelConfig,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    sidebarCollapsed: isCollapsed,
    toggleSidebar,
    sidebarMobileOpen,
    setMobileSidebarOpen,
  } = useUIStore();
  const { totalUnread } = useUnreadCounts();

  function closeMobile() {
    setMobileSidebarOpen(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    try {
      const { logout: serverLogout } = await import("@/lib/actions/auth");
      await serverLogout();
    } catch {
      // Fallback: try clearing non-httpOnly cookies
      document.cookie = "x-user-role=; path=/; max-age=0";
      document.cookie = "x-onboarding-done=; path=/; max-age=0";
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop */}
      {sidebarMobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={cn(
          "dark z-30 flex h-dvh flex-col border-r border-white/[0.06] bg-[#050505] transition-all duration-300",
          "fixed left-0 top-0",
          "md:static",
          sidebarMobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          "shrink-0",
        )}
        style={
          {
            "--sidebar-w": isCollapsed ? "68px" : "240px",
            width: "var(--sidebar-w)",
            maxWidth: "75vw",
          } as React.CSSProperties
        }
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-14 items-center border-b border-white/[0.06] px-4",
            isCollapsed ? "md:justify-center md:px-0" : "",
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5",
              isCollapsed && "md:justify-center",
            )}
            onClick={closeMobile}
          >
            <Image
              src={whiteLabelConfig?.logo_url || "/logo.png"}
              alt={
                whiteLabelConfig?.brand_name ||
                whiteLabelConfig?.app_name ||
                "Sales System"
              }
              width={28}
              height={28}
              className="shrink-0"
            />
            {!isCollapsed && (
              <span className="text-[15px] font-bold text-white whitespace-nowrap tracking-tight">
                {whiteLabelConfig?.brand_name || whiteLabelConfig?.app_name ? (
                  <span className="text-emerald-400">
                    {whiteLabelConfig.brand_name || whiteLabelConfig.app_name}
                  </span>
                ) : (
                  <>
                    Sales<span className="text-emerald-400">System</span>
                  </>
                )}
              </span>
            )}
          </Link>
        </div>

        {/* Navigation with sections */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter((item) =>
              item.roles.includes(role),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx}>
                {/* Section divider & label */}
                {sIdx > 0 && (
                  <div className="mx-2 mt-4 mb-2 border-t border-white/[0.04]" />
                )}
                {section.label && !isCollapsed && (
                  <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
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
                          "group relative flex items-center rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200",
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                            : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
                          isCollapsed && "md:justify-center md:px-0",
                        )}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-500" />
                        )}

                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
                            isCollapsed ? "" : "mr-3",
                            isActive ? "text-emerald-400" : "",
                          )}
                        />
                        <span className={cn(isCollapsed && "md:hidden")}>
                          {item.label}
                        </span>

                        {/* Badge messages non lus */}
                        {item.href === "/chat" && totalUnread > 0 && (
                          <span
                            className={cn(
                              "flex items-center justify-center rounded-full bg-emerald-500 text-black text-[10px] font-bold leading-none",
                              isCollapsed
                                ? "absolute -top-1 -right-1 md:flex hidden h-4 min-w-4 px-1"
                                : "ml-auto h-[18px] min-w-[18px] px-1.5",
                            )}
                          >
                            {totalUnread > 99 ? "99+" : totalUnread}
                          </span>
                        )}
                      </Link>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                          <TooltipContent
                            side="right"
                            className="bg-zinc-900 text-zinc-100 border-white/[0.06]"
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
        <div className="hidden border-t border-white/[0.06] px-2.5 py-2.5 md:block">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-zinc-600 transition-all duration-200 hover:bg-white/[0.04] hover:text-zinc-400"
            title={isCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-[18px] w-[18px]" />
            ) : (
              <>
                <PanelLeftClose className="h-[18px] w-[18px]" />
                <span className="ml-3 text-[13px]">Réduire</span>
              </>
            )}
          </button>
        </div>

        {/* User profile */}
        <div className="border-t border-white/[0.06] px-2.5 py-3">
          <div
            className={cn(
              "flex items-center rounded-lg px-3 py-2",
              isCollapsed && "md:justify-center md:px-0",
            )}
          >
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-emerald-500/20"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-400 ring-2 ring-emerald-500/10">
                  {getInitials(userName)}
                </div>
              )}
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#050505]" />
            </div>
            <div
              className={cn("ml-3 min-w-0 flex-1", isCollapsed && "md:hidden")}
            >
              <p className="truncate text-sm font-medium text-white">
                {userName}
              </p>
              <p className="truncate text-[11px] text-zinc-600 capitalize">
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
                    "mt-0.5 flex w-full items-center rounded-lg px-3 py-2 text-[13px] transition-all duration-200",
                    pathname.startsWith("/settings")
                      ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
                    isCollapsed && "md:justify-center md:px-0",
                  )}
                >
                  <Settings
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isCollapsed ? "" : "mr-3",
                      pathname.startsWith("/settings") ? "text-emerald-400" : "",
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
                  className="bg-zinc-900 text-zinc-100 border-white/[0.06]"
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
                    "mt-0.5 flex w-full items-center rounded-lg px-3 py-2 text-[13px] transition-all duration-200",
                    pathname === "/profile"
                      ? "bg-emerald-500/10 text-emerald-400 font-semibold"
                      : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300",
                    isCollapsed && "md:justify-center md:px-0",
                  )}
                >
                  <UserCircle
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isCollapsed ? "" : "mr-3",
                      pathname === "/profile" ? "text-emerald-400" : "",
                    )}
                  />
                  <span className={cn(isCollapsed && "md:hidden")}>Profil</span>
                </Link>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent
                  side="right"
                  className="bg-zinc-900 text-zinc-100 border-white/[0.06]"
                >
                  Profil
                </TooltipContent>
              )}
            </Tooltip>
          )}

          {/* Sign out */}
          <button
            onClick={handleLogout}
            className={cn(
              "mt-0.5 flex w-full items-center rounded-lg px-3 py-2 text-[13px] text-zinc-600 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400",
              isCollapsed && "md:justify-center md:px-0",
            )}
          >
            <LogOut
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                isCollapsed ? "" : "mr-3",
              )}
            />
            <span className={cn(isCollapsed && "md:hidden")}>
              Déconnexion
            </span>
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
