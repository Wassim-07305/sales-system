"use client";

import { create } from "zustand";

interface MessagingState {
  activeChannelId: string | null;
  setActiveChannelId: (id: string | null) => void;

  threadMessageId: string | null;
  setThreadMessageId: (id: string | null) => void;

  replyToMessageId: string | null;
  replyToMessage: { id: string; content: string; senderName: string } | null;
  setReplyTo: (
    msg: { id: string; content: string; senderName: string } | null,
  ) => void;

  editingMessageId: string | null;
  setEditingMessageId: (id: string | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  showMembersPanel: boolean;
  setShowMembersPanel: (show: boolean) => void;

  showSearchPanel: boolean;
  setShowSearchPanel: (show: boolean) => void;

  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useMessagingStore = create<MessagingState>((set) => ({
  activeChannelId: null,
  setActiveChannelId: (id) => set({ activeChannelId: id }),

  threadMessageId: null,
  setThreadMessageId: (id) => set({ threadMessageId: id }),

  replyToMessageId: null,
  replyToMessage: null,
  setReplyTo: (msg) =>
    set({ replyToMessageId: msg?.id ?? null, replyToMessage: msg }),

  editingMessageId: null,
  setEditingMessageId: (id) => set({ editingMessageId: id }),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  showMembersPanel: false,
  setShowMembersPanel: (show) => set({ showMembersPanel: show }),

  showSearchPanel: false,
  setShowSearchPanel: (show) => set({ showSearchPanel: show }),

  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}));
