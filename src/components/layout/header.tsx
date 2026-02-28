"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Sun, Moon, Monitor, User, LogOut, Search } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { BREADCRUMB_LABELS } from "@/lib/constants";
import { useUIStore } from "@/stores/ui-store";
import type { UserRole } from "@/lib/types/database";
import { createClient } from "@/lib/supabase/client";

interface HeaderProps {
  userName: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  userId: string;
  unreadCount: number;
}

export function Header({ userName, email, avatarUrl, role, userId, unreadCount }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    toggleMobileSidebar,
    setNotificationsPanelOpen,
    setSearchOpen,
    theme,
    setTheme,
  } = useUIStore();

  // Breadcrumb from pathname — skip UUID segments
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments
    .filter((seg) => !UUID_RE.test(seg))
    .map((seg) => BREADCRUMB_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1));

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-card/80 px-4 backdrop-blur-sm md:px-6">
      {/* Left: Hamburger (mobile) + Breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="hidden items-center gap-1.5 text-sm md:flex">
          {breadcrumbs.map((crumb, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <span className="text-muted-foreground/40">/</span>}
              <span
                className={cn(
                  idx === breadcrumbs.length - 1
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      </div>

      {/* Center: Global Search */}
      <div className="hidden flex-1 items-center justify-center px-8 md:flex">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            "flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 text-sm text-muted-foreground",
            "transition-all duration-200 hover:border-border hover:bg-background"
          )}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="pointer-events-none hidden items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Theme + Notifications + User */}
      <div className="flex items-center gap-1.5">
        {/* Search mobile */}
        <button
          onClick={() => setSearchOpen(true)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        {/* Theme toggle: light → dark → system */}
        <button
          onClick={() =>
            setTheme(
              theme === "light" ? "dark" : theme === "dark" ? "system" : "light"
            )
          }
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={
            theme === "light"
              ? "Mode clair"
              : theme === "dark"
                ? "Mode sombre"
                : "Système"
          }
        >
          {theme === "light" ? (
            <Sun className="h-5 w-5" />
          ) : theme === "dark" ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
        </button>

        {/* Notification bell */}
        <button
          onClick={() => setNotificationsPanelOpen(true)}
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-dark">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative group">
          <button className="flex items-center gap-2 rounded-xl p-1.5 transition-colors hover:bg-secondary">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/20 text-xs font-semibold text-brand">
                {getInitials(userName)}
              </div>
            )}
          </button>

          {/* Dropdown */}
          <div className="invisible absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card p-1 opacity-0 shadow-lg transition-all group-focus-within:visible group-focus-within:opacity-100">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="mx-2 border-t border-border" />
            <button
              onClick={() => router.push("/profile")}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
            >
              <User className="h-4 w-4" />
              Mon profil
            </button>
            <div className="mx-2 border-t border-border" />
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
