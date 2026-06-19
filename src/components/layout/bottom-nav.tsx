"use client"

import { Home, Search, Plus, Bell, MessageCircle, User } from "lucide-react"
import { useAppStore, type AppView } from "@/lib/store"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

const items: { view: AppView | "compose"; label: string; icon: React.ElementType }[] = [
  { view: "feed", label: "Beranda", icon: Home },
  { view: "search", label: "Cari", icon: Search },
  { view: "compose", label: "Buat", icon: Plus },
  { view: "notifications", label: "Notif", icon: Bell },
  { view: "messages", label: "Pesan", icon: MessageCircle },
  { view: "profile", label: "Profil", icon: User },
]

export function BottomNav() {
  const { data: session } = useSession()
  const { currentView, setView, openProfile, setComposerOpen, unreadNotifications, unreadMessages } =
    useAppStore()

  if (!session?.user) return null

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 glass safe-bottom">
      {/* Floating compose button */}
      <button
        onClick={() => setComposerOpen(true)}
        className="absolute -top-5 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="size-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Plus className="size-6 text-white" />
        </div>
      </button>

      <div className="grid grid-cols-5 h-14">
        {items.filter(i => i.view !== "compose").map((item) => {
          const isActive =
            (item.view === "profile" && currentView === "profile") ||
            (item.view !== "profile" && item.view !== "compose" && currentView === item.view)
          const badge =
            item.view === "notifications"
              ? unreadNotifications
              : item.view === "messages"
              ? unreadMessages
              : 0

          return (
            <button
              key={item.view}
              onClick={() => {
                if (item.view === "profile") {
                  openProfile(session.user.id)
                } else if (item.view !== "compose") {
                  setView(item.view)
                }
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 relative transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {badge > 0 && (
                <span className="absolute top-1 right-[calc(50%-1.25rem)] min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
