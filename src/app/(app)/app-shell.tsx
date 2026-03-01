"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import type { UserRole } from "@/lib/types/database";

interface AppShellProps {
  role: UserRole;
  userName: string;
  email: string;
  avatarUrl?: string | null;
  userId: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  userName,
  email,
  avatarUrl,
  userId,
  children,
}: AppShellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  return (
    <ThemeProvider>
      <NavigationProgress />
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar role={role} userName={userName} avatarUrl={avatarUrl} />

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <Header
            userName={userName}
            email={email}
            avatarUrl={avatarUrl}
            role={role}
            userId={userId}
            unreadCount={unreadCount}
          />

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-5 pb-20 md:p-8 md:pb-8">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav role={role} />

        {/* Global overlays */}
        <NotificationsPanel
          userId={userId}
          onUnreadCountChange={handleUnreadCountChange}
        />
        <GlobalSearch />
      </div>
    </ThemeProvider>
  );
}
