"use client"

import { useState } from "react"
import { Home, Search, Plus, MessageCircle, User } from "lucide-react"
import { useAppStore, type AppView } from "@/lib/store"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { StoryComposer } from "@/components/stories/stories-bar"

const items: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: "feed", label: "Beranda", icon: Home },
  { view: "search", label: "Cari", icon: Search },
  { view: "messages", label: "Pesan", icon: MessageCircle },
  { view: "profile", label: "Profil", icon: User },
]

export function BottomNav() {
  const { data: session } = useSession()
  const { currentView, setView, openProfile, unreadMessages } = useAppStore()
  const [storyOpen, setStoryOpen] = useState(false)

  if (!session?.user) return null

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 glass safe-bottom">
        <div className="grid grid-cols-5 h-14">
          {items.slice(0, 2).map((item) => {
            const isActive = currentView === item.view
            const badge = item.view === "messages" ? unreadMessages : 0

            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
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

          {/* Center compose button → Story */}
          <button
            onClick={() => setStoryOpen(true)}
            className="flex items-center justify-center"
          >
            <div className="size-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Plus className="size-6 text-white" />
            </div>
          </button>

          {items.slice(2).map((item) => {
            const isActive =
              item.view === "profile"
                ? currentView === "profile"
                : currentView === item.view
            const badge = item.view === "messages" ? unreadMessages : 0

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

      <StoryComposer
        open={storyOpen}
        onOpenChange={setStoryOpen}
        onCreated={() => setStoryOpen(false)}
      />
    </>
  )
}
