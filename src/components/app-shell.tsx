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
import { NotificationsView } from "@/components/notifications/notifications-view"
import { FriendsView } from "@/components/friends/friends-view"
import { SearchView } from "@/components/friends/search-view"
import { SettingsView } from "@/components/profile/settings-view"
import { DiscoverView } from "@/components/feed/discover-view"
import { useEffect } from "react"
import { GlobalSocketConnector } from "@/components/common/global-socket-connector"
import { useUnreadCounts } from "@/hooks/api/use-unread-counts"
import dynamic from "next/dynamic"

const MessagesView = dynamic(
  () => import("@/components/messages/messages-view").then((m) => ({ default: m.MessagesView })),
  { ssr: false }
)

const AdminView = dynamic(
  () => import("@/components/admin/admin-view").then((m) => ({ default: m.AdminView })),
  { ssr: false }
)

const PostComposerDialog = dynamic(
  () =>
    import("@/components/feed/post-composer-dialog").then((m) => ({
      default: m.PostComposerDialog,
    })),
  { ssr: false }
)

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

  // Poll unread counts via TanStack Query (30s interval)
  useUnreadCounts(status === "authenticated")

  if (status === "loading") {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <div className="border-primary/20 border-t-primary size-10 animate-spin rounded-full border-4" />
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-lg focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Langsung ke konten
      </a>
      <GlobalSocketConnector />
      <Header />
      <MobileMenu />
      <div className="flex flex-1">
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-16 lg:pb-0">
          <div
            className={
              currentView === "messages"
                ? "mx-auto h-full w-full"
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
            {currentView === "admin" && <AdminView />}
          </div>
        </main>
        {currentView !== "messages" && <RightSidebar />}
      </div>
      <BottomNav />
      <PostComposerDialog />
    </div>
  )
}
