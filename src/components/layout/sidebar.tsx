"use client"

import {
  Home,
  Users,
  Bell,
  MessageCircle,
  User,
  Settings,
  Compass,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppStore, type AppView } from "@/lib/store"
import { useSession } from "next-auth/react"
import { UserAvatar } from "@/components/common/user-avatar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: "feed", label: "Beranda", icon: Home },
  { view: "discover", label: "Jelajahi", icon: Compass },
  { view: "friends", label: "Teman", icon: Users },
  { view: "notifications", label: "Notifikasi", icon: Bell },
  { view: "messages", label: "Pesan", icon: MessageCircle },
  { view: "profile", label: "Profil", icon: User },
  { view: "settings", label: "Pengaturan", icon: Settings },
]

export function Sidebar() {
  const { data: session } = useSession()
  const { currentView, setView, openProfile, unreadNotifications, unreadMessages, pendingFriendRequests } =
    useAppStore()

  if (!session?.user) return null

  const getBadge = (view: AppView) => {
    if (view === "notifications" && unreadNotifications > 0) return unreadNotifications
    if (view === "messages" && unreadMessages > 0) return unreadMessages
    if (view === "friends" && pendingFriendRequests > 0) return pendingFriendRequests
    return null
  }

  return (
    <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] py-4 px-3 border-r">
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = currentView === item.view
          const badge = getBadge(item.view)
          return (
            <button
              key={item.view}
              onClick={() => {
                if (item.view === "profile") {
                  openProfile(session.user.id)
                } else {
                  setView(item.view)
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/70 hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className={cn("size-5", isActive && "text-primary")} />
              <span className="flex-1 text-left">{item.label}</span>
              {badge !== null && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User card */}
      <div className="mt-4 p-3 rounded-xl border bg-card">
        <div className="flex items-center gap-3">
          <UserAvatar
            src={session.user.image ?? null}
            name={session.user.name ?? null}
            seed={session.user.id}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">
              {session.user.name}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              @{session.user.username}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
