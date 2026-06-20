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
      <nav className="bg-background/95 glass safe-bottom fixed right-0 bottom-0 left-0 z-40 border-t lg:hidden">
        <div className="grid h-14 grid-cols-5">
          {items.slice(0, 2).map((item) => {
            const isActive = currentView === item.view
            const badge = item.view === "messages" ? unreadMessages : 0

            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {badge > 0 && (
                  <span className="bg-primary text-primary-foreground absolute top-1 right-[calc(50%-1.25rem)] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {isActive && (
                  <span className="bg-primary absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" />
                )}
              </button>
            )
          })}

          {/* Center compose button → Story */}
          <button
            onClick={() => setStoryOpen(true)}
            className="flex items-center justify-center"
            aria-label="Buat Story"
          >
            <div className="bg-primary flex size-12 items-center justify-center rounded-full shadow-lg">
              <Plus className="size-6 text-white" />
            </div>
          </button>

          {items.slice(2).map((item) => {
            const isActive =
              item.view === "profile" ? currentView === "profile" : currentView === item.view
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
                  "relative flex flex-col items-center justify-center gap-0.5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
                {badge > 0 && (
                  <span className="bg-primary text-primary-foreground absolute top-1 right-[calc(50%-1.25rem)] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
                {isActive && (
                  <span className="bg-primary absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full" />
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
