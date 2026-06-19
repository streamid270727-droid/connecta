"use client"

import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { BottomNav } from "@/components/layout/bottom-nav"
import { MobileMenu } from "@/components/layout/mobile-menu"
import { useAppStore } from "@/lib/store"
import { FeedView } from "@/components/feed/feed-view"
import { ProfileView } from "@/components/profile/profile-view"
import { MessagesView } from "@/components/messages/messages-view"
import { NotificationsView } from "@/components/notifications/notifications-view"
import { FriendsView } from "@/components/friends/friends-view"
import { SearchView } from "@/components/friends/search-view"
import { SettingsView } from "@/components/profile/settings-view"
import { DiscoverView } from "@/components/feed/discover-view"
import { PostComposerDialog } from "@/components/feed/post-composer-dialog"
import { useEffect } from "react"
import { GlobalSocketConnector } from "@/components/common/global-socket-connector"

export function AppShell() {
  const { data: session, status } = useSession()
  const { currentView, setUserProfile } = useAppStore()

  // Initialize userProfile from session
  useEffect(() => {
    if (session?.user) {
      setUserProfile({
        avatarUrl: session.user.image ?? null,
        name: session.user.name ?? null,
      })
    }
  }, [session, setUserProfile])

  // Periodically refresh unread counts
  useEffect(() => {
    if (status !== "authenticated") return
    void refreshCounts()
    const interval = setInterval(refreshCounts, 30000)
    return () => clearInterval(interval)
  }, [status])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <GlobalSocketConnector />
      <Header />
      <MobileMenu />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          <div
            className={
              currentView === "messages"
                ? "mx-auto w-full h-full"
                : "mx-auto w-full max-w-2xl lg:max-w-3xl xl:max-w-none xl:px-0"
            }
          >
            {currentView === "feed" && <FeedView />}
            {currentView === "discover" && <DiscoverView />}
            {currentView === "profile" && <ProfileView />}
            {currentView === "messages" && <MessagesView />}
            {currentView === "notifications" && <NotificationsView />}
            {currentView === "friends" && <FriendsView />}
            {currentView === "search" && <SearchView />}
            {currentView === "settings" && <SettingsView />}
          </div>
        </main>
        {currentView !== "messages" && <RightSidebar />}
      </div>
      <BottomNav />
      <PostComposerDialog />
    </div>
  )
}

async function refreshCounts() {
  try {
    const [notifRes, msgRes, friendRes] = await Promise.all([
      fetch("/api/notifications?count=1"),
      fetch("/api/conversations?unread=1"),
      fetch("/api/friends/requests?count=1"),
    ])
    const store = (await import("@/lib/store")).useAppStore.getState()
    if (notifRes.ok) {
      const data = await notifRes.json()
      store.setUnreadNotifications(data.unreadCount || 0)
    }
    if (msgRes.ok) {
      const data = await msgRes.json()
      store.setUnreadMessages(data.unreadCount || 0)
    }
    if (friendRes.ok) {
      const data = await friendRes.json()
      store.setPendingFriendRequests(data.count || 0)
    }
  } catch (e) {
    // ignore
  }
}
