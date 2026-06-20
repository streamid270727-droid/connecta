import { describe, it, expect, beforeEach } from "vitest"
import { useAppStore } from "@/lib/store"

describe("useAppStore", () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: "feed",
      profileTargetId: null,
      conversationTarget: null,
      composerOpen: false,
      mobileMenuOpen: false,
      searchQuery: "",
      unreadNotifications: 0,
      unreadMessages: 0,
      pendingFriendRequests: 0,
    })
  })

  it("has default state", () => {
    const state = useAppStore.getState()
    expect(state.currentView).toBe("feed")
    expect(state.profileTargetId).toBeNull()
    expect(state.composerOpen).toBe(false)
  })

  it("setView changes current view", () => {
    useAppStore.getState().setView("messages")
    expect(useAppStore.getState().currentView).toBe("messages")
    expect(useAppStore.getState().profileTargetId).toBeNull()
  })

  it("openProfile sets profile view and target", () => {
    useAppStore.getState().openProfile("user123")
    expect(useAppStore.getState().currentView).toBe("profile")
    expect(useAppStore.getState().profileTargetId).toBe("user123")
  })

  it("setComposerOpen toggles composer", () => {
    useAppStore.getState().setComposerOpen(true)
    expect(useAppStore.getState().composerOpen).toBe(true)
    useAppStore.getState().setComposerOpen(false)
    expect(useAppStore.getState().composerOpen).toBe(false)
  })

  it("openConversation sets conversation target", () => {
    useAppStore.getState().openConversation("conv1", "user2")
    const state = useAppStore.getState()
    expect(state.currentView).toBe("messages")
    expect(state.conversationTarget).toEqual({ conversationId: "conv1", otherUserId: "user2" })
  })

  it("setUnreadMessages updates count", () => {
    useAppStore.getState().setUnreadMessages(5)
    expect(useAppStore.getState().unreadMessages).toBe(5)
  })

  it("setUnreadNotifications updates count", () => {
    useAppStore.getState().setUnreadNotifications(3)
    expect(useAppStore.getState().unreadNotifications).toBe(3)
  })
})
