"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { UserRole } from "@/lib/types/database";

interface AppShellProps {
  role: UserRole;
  userName: string;
  avatarUrl?: string | null;
  children: React.ReactNode;
}

export function AppShell({ role, userName, avatarUrl, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar role={role} userName={userName} avatarUrl={avatarUrl} />
      </div>

      {/* Main content */}
      <main className="md:pl-[240px] pb-20 md:pb-0 min-h-screen">
        <div className="p-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNav role={role} />
    </div>
  );
}
