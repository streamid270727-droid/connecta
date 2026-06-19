"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { TrendingUp, UserPlus, Hash, Flame, Activity } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { formatRelativeTime } from "@/lib/format"

interface SuggestedUser {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  bio: string | null
  mutualFriends: number
}

interface TrendingTopic {
  tag: string
  count: number
}

export function RightSidebar() {
  const { data: session } = useSession()
  const { openProfile, openConversation, setSearchQuery, setView } = useAppStore()
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [onlineFriends, setOnlineFriends] = useState<
    { id: string; name: string; username: string; avatarUrl: string | null }[]
  >([])
  const [trending, setTrending] = useState<TrendingTopic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    void loadSuggestions()
    void loadOnlineFriends()
    void loadTrending()

    async function loadSuggestions() {
      try {
        const res = await fetch("/api/friends/suggestions")
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.slice(0, 5))
        }
      } catch (e) {
        // ignore
      }
    }

    async function loadOnlineFriends() {
      try {
        const res = await fetch("/api/users/online")
        if (res.ok) {
          const data = await res.json()
          setOnlineFriends(data.users || [])
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    async function loadTrending() {
      try {
        const res = await fetch("/api/trending")
        if (res.ok) {
          const data = await res.json()
          setTrending(data.trending || [])
        }
      } catch (e) {
        // ignore
      }
    }
  }, [session?.user?.id])

  const searchTrending = (tag: string) => {
    setSearchQuery(`#${tag}`)
    setView("search")
  }

  const sendRequest = async (userId: string) => {
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId }),
      })
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.id !== userId))
      }
    } catch (e) {
      // ignore
    }
  }

  if (!session?.user) return null

  return (
    <aside className="hidden xl:flex flex-col w-72 shrink-0 sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] py-4 px-3 gap-4 overflow-y-auto no-scrollbar">
      {/* Online friends */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">Teman Aktif</h3>
          </div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {onlineFriends.length} online
          </span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="size-8 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : onlineFriends.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Belum ada teman online
          </p>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1 pr-2">
              {onlineFriends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() =>
                    openConversation("", friend.id)
                  }
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="relative">
                    <UserAvatar
                      src={friend.avatarUrl}
                      name={friend.name}
                      seed={friend.id}
                      size="sm"
                    />
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                  </div>
                  <span className="text-sm font-medium truncate flex-1">
                    {friend.name}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Trending topics */}
      {trending.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="size-4 text-orange-500" />
            <h3 className="font-semibold text-sm">Trending</h3>
            <span className="text-xs text-muted-foreground ml-auto">48 jam</span>
          </div>
          <div className="space-y-1">
            {trending.map((t, i) => (
              <button
                key={t.tag}
                onClick={() => searchTrending(t.tag)}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors text-left group"
              >
                <span className="text-xs font-bold text-muted-foreground w-4">
                  {i + 1}
                </span>
                <Hash className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm font-medium truncate flex-1 group-hover:text-primary transition-colors">
                  {t.tag}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {t.count} postingan
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Friend suggestions */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="size-4 text-primary" />
          <h3 className="font-semibold text-sm">Saran Teman</h3>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Tidak ada saran saat ini
          </p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((user) => (
              <div key={user.id} className="flex items-start gap-2.5">
                <button onClick={() => openProfile(user.id)}>
                  <UserAvatar
                    src={user.avatarUrl}
                    name={user.name}
                    seed={user.id}
                    size="sm"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => openProfile(user.id)}
                    className="text-sm font-medium hover:underline truncate block w-full text-left"
                  >
                    {user.name}
                  </button>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.mutualFriends > 0
                      ? `${user.mutualFriends} teman bersama`
                      : user.bio || `@${user.username}`}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 mt-1.5 text-xs px-2.5"
                    onClick={() => sendRequest(user.id)}
                  >
                    Tambah
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </aside>
  )
}
