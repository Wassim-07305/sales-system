"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface UIState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  notificationsPanelOpen: boolean;
  searchOpen: boolean;
  quickNoteOpen: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setNotificationsPanelOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setQuickNoteOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      notificationsPanelOpen: false,
      searchOpen: false,
      quickNoteOpen: false,
      theme: "light" as Theme,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleMobileSidebar: () =>
        set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),
      setMobileSidebarOpen: (open) => set({ sidebarMobileOpen: open }),
      setNotificationsPanelOpen: (open) => set({ notificationsPanelOpen: open }),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setQuickNoteOpen: (open) => set({ quickNoteOpen: open }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "sales-ui-store",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
