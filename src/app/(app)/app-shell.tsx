"use client";

import { useState, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationsPanel } from "@/components/layout/notifications-panel";
import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { OfflineIndicator } from "@/components/offline-indicator";
import { Providers } from "@/components/providers";
import dynamic from "next/dynamic";
import type { UserRole } from "@/lib/types/database";

const AiCoachWidget = dynamic(
  () =>
    import("@/components/ai-coach-widget").then((m) => ({
      default: m.AiCoachWidget,
    })),
  { ssr: false },
);

const IncomingCallToast = dynamic(
  () =>
    import("@/components/incoming-call-toast").then((m) => ({
      default: m.IncomingCallToast,
    })),
  { ssr: false },
);

export interface WhiteLabelConfig {
  brand_name?: string | null;
  app_name?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  custom_domain?: string | null;
  is_active?: boolean;
}

interface AppShellProps {
  role: UserRole;
  userName: string;
  email: string;
  avatarUrl?: string | null;
  userId: string;
  whiteLabelConfig?: WhiteLabelConfig | null;
  children: React.ReactNode;
}

export function AppShell({
  role,
  userName,
  email,
  avatarUrl,
  userId,
  whiteLabelConfig,
  children,
}: AppShellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const handleUnreadCountChange = useCallback((count: number) => {
    setUnreadCount(count);
  }, []);

  // Build white-label config only if active
  const wl = whiteLabelConfig?.is_active ? whiteLabelConfig : null;

  return (
    <Providers>
      <ThemeProvider>
        <NavigationProgress />
        {wl?.primary_color && (
          <style
            dangerouslySetInnerHTML={{
              __html: `
              :root {
                --brand: ${wl.primary_color};
                --sidebar-primary: ${wl.primary_color};
              }
              ${wl.secondary_color ? `:root { --sidebar: ${wl.secondary_color}; --sidebar-background: ${wl.secondary_color}; }` : ""}
            `,
            }}
          />
        )}
        <div className="flex h-dvh overflow-hidden bg-background">
          {/* Sidebar */}
          <Sidebar
            role={role}
            userName={userName}
            avatarUrl={avatarUrl}
            whiteLabelConfig={wl}
          />

          {/* Main area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Offline indicator */}
            <OfflineIndicator />

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
            <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8">
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
          <AiCoachWidget />
          <IncomingCallToast />
        </div>
      </ThemeProvider>
    </Providers>
  );
}
