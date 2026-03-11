"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUIStore } from "@/stores/ui-store";
import { QuickNoteModal } from "@/components/quick-note-modal";

/**
 * Global keyboard shortcuts:
 * - Cmd/Ctrl + K: Open search
 * - Cmd/Ctrl + N: Open quick note
 * - Cmd/Ctrl + B: Toggle sidebar
 * - Cmd/Ctrl + Shift + N: Open notifications
 * - G then D: Go to Dashboard
 * - G then C: Go to CRM
 * - G then P: Go to Prospecting
 * - G then A: Go to Academy
 * - Escape: Close modals
 */
export function KeyboardShortcutsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    setSearchOpen,
    setQuickNoteOpen,
    quickNoteOpen,
    toggleSidebar,
    setNotificationsPanelOpen,
  } = useUIStore();

  // Track "g" key for navigation shortcuts
  let gPressed = false;
  let gTimeout: NodeJS.Timeout | null = null;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Escape even in input fields
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuickNoteOpen(false);
        setNotificationsPanelOpen(false);
        return;
      }

      // Don't trigger other shortcuts in input fields
      if (isInputField) return;

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K: Open search (already handled by GlobalSearch, but ensure consistency)
      if (isMod && e.key === "k") {
        e.preventDefault();
        return; // Let GlobalSearch handle this
      }

      // Cmd/Ctrl + N: Quick note
      if (isMod && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        setQuickNoteOpen(true);
        return;
      }

      // Cmd/Ctrl + B: Toggle sidebar
      if (isMod && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd/Ctrl + Shift + N: Notifications
      if (isMod && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setNotificationsPanelOpen(true);
        return;
      }

      // G-key navigation (press G, then another key)
      if (e.key === "g" && !isMod) {
        gPressed = true;
        if (gTimeout) clearTimeout(gTimeout);
        gTimeout = setTimeout(() => {
          gPressed = false;
        }, 500);
        return;
      }

      if (gPressed && !isMod) {
        gPressed = false;
        if (gTimeout) clearTimeout(gTimeout);

        switch (e.key) {
          case "d":
            e.preventDefault();
            router.push("/dashboard");
            break;
          case "c":
            e.preventDefault();
            router.push("/crm");
            break;
          case "p":
            e.preventDefault();
            router.push("/prospecting");
            break;
          case "a":
            e.preventDefault();
            router.push("/academy");
            break;
          case "b":
            e.preventDefault();
            router.push("/bookings");
            break;
          case "t":
            e.preventDefault();
            router.push("/team");
            break;
          case "s":
            e.preventDefault();
            router.push("/settings");
            break;
        }
      }
    },
    [router, setSearchOpen, setQuickNoteOpen, toggleSidebar, setNotificationsPanelOpen]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {children}
      <QuickNoteModal
        open={quickNoteOpen}
        onOpenChange={setQuickNoteOpen}
      />
    </>
  );
}
