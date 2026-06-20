"use client"

import { create } from "zustand"

export type AppView =
  | "feed"
  | "profile"
  | "messages"
  | "notifications"
  | "friends"
  | "search"
  | "settings"
  | "discover"
  | "admin"

interface ProfileViewTarget {
  userId: string
}

interface ConversationTarget {
  conversationId: string
  otherUserId: string
}

interface AppState {
  // Navigation
  currentView: AppView
  profileTargetId: string | null
  conversationTarget: ConversationTarget | null
  setView: (view: AppView) => void
  openProfile: (userId: string) => void
  openConversation: (conversationId: string, otherUserId: string) => void

  // Composer (quick post from anywhere)
  composerOpen: boolean
  setComposerOpen: (open: boolean) => void

  // Mobile sidebar
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void

  // Search query (shared)
  searchQuery: string
  setSearchQuery: (q: string) => void

  // Current user profile (for reactive avatar/name updates)
  userProfile: { avatarUrl: string | null; name: string | null } | null
  setUserProfile: (profile: { avatarUrl: string | null; name: string | null }) => void

  // Unread counts (refreshed from server)
  unreadNotifications: number
  unreadMessages: number
  pendingFriendRequests: number
  setUnreadNotifications: (n: number) => void
  setUnreadMessages: (n: number) => void
  setPendingFriendRequests: (n: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: "feed",
  profileTargetId: null,
  conversationTarget: null,
  setView: (view) => set({ currentView: view, profileTargetId: null }),
  openProfile: (userId) =>
    set({ currentView: "profile", profileTargetId: userId }),
  openConversation: (conversationId, otherUserId) =>
    set({
      currentView: "messages",
      conversationTarget: { conversationId, otherUserId },
    }),

  composerOpen: false,
  setComposerOpen: (open) => set({ composerOpen: open }),

  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),

  userProfile: null,
  setUserProfile: (profile) => set({ userProfile: profile }),

  unreadNotifications: 0,
  unreadMessages: 0,
  pendingFriendRequests: 0,
  setUnreadNotifications: (n) => set({ unreadNotifications: n }),
  setUnreadMessages: (n) => set({ unreadMessages: n }),
  setPendingFriendRequests: (n) => set({ pendingFriendRequests: n }),
}))
