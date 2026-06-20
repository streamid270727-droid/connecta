"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { TrendingUp, UserPlus, Hash, Flame, Activity } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useFriendSuggestions, useSendFriendRequest } from "@/hooks/api/use-friends"

interface OnlineUser {
  id: string
  name: string
  username: string
  avatarUrl: string | null
}

interface TrendingTopic {
  tag: string
  count: number
}

export function RightSidebar() {
  const { data: session } = useSession()
  const { openProfile, openConversation, setSearchQuery, setView } = useAppStore()
  const qc = useQueryClient()
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const suggestionsQuery = useFriendSuggestions()
  const sendRequestMutation = useSendFriendRequest()

  const onlineQuery = useQuery({
    queryKey: ["onlineFriends"],
    queryFn: async (): Promise<OnlineUser[]> => {
      const res = await fetch("/api/users/online")
      if (!res.ok) return []
      const data = await res.json()
      return data.users || []
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const trendingQuery = useQuery({
    queryKey: ["trending"],
    queryFn: async (): Promise<TrendingTopic[]> => {
      const res = await fetch("/api/trending")
      if (!res.ok) return []
      const data = await res.json()
      return data.trending || []
    },
    staleTime: 60_000,
  })

  const searchTrending = (tag: string) => {
    setSearchQuery(`#${tag}`)
    setView("search")
  }

  const sendRequest = async (userId: string) => {
    try {
      await sendRequestMutation.mutateAsync(userId)
      setSentIds((prev) => new Set([...prev, userId]))
    } catch {
      // ignore
    }
  }

  if (!session?.user) return null

  const suggestions = (suggestionsQuery.data ?? []).slice(0, 5)
  const onlineFriends = onlineQuery.data ?? []
  const trending = trendingQuery.data ?? []

  return (
    <aside className="no-scrollbar sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 flex-col gap-4 overflow-y-auto px-3 py-4 sm:top-16 sm:h-[calc(100vh-4rem)] xl:flex">
      {/* Online friends */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">Teman Aktif</h3>
          </div>
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {onlineFriends.length} online
          </span>
        </div>
        {onlineQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="bg-muted size-8 animate-pulse rounded-full" />
                <div className="bg-muted h-3 w-20 animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : onlineFriends.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">Belum ada teman online</p>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-1 pr-2">
              {onlineFriends.map((friend) => (
                <button
                  key={friend.id}
                  onClick={() => openConversation("", friend.id)}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors"
                >
                  <div className="relative">
                    <UserAvatar
                      src={friend.avatarUrl}
                      name={friend.name}
                      seed={friend.id}
                      size="sm"
                    />
                    <span className="ring-background absolute right-0 bottom-0 size-2.5 rounded-full bg-emerald-500 ring-2" />
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{friend.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Trending topics */}
      {trending.length > 0 && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="size-4 text-orange-500" />
            <h3 className="text-sm font-semibold">Trending</h3>
            <span className="text-muted-foreground ml-auto text-xs">48 jam</span>
          </div>
          <div className="space-y-1">
            {trending.map((t, i) => (
              <button
                key={t.tag}
                onClick={() => searchTrending(t.tag)}
                className="hover:bg-accent group flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors"
              >
                <span className="text-muted-foreground w-4 text-xs font-bold">{i + 1}</span>
                <Hash className="text-muted-foreground group-hover:text-primary size-3.5 transition-colors" />
                <span className="group-hover:text-primary flex-1 truncate text-sm font-medium transition-colors">
                  {t.tag}
                </span>
                <span className="text-muted-foreground text-[10px]">{t.count} postingan</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Friend suggestions */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus className="text-primary size-4" />
          <h3 className="text-sm font-semibold">Saran Teman</h3>
        </div>
        {suggestions.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">Tidak ada saran saat ini</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((user) => (
              <div key={user.id} className="flex items-start gap-2.5">
                <button
                  onClick={() => openProfile(user.id)}
                  aria-label={`Lihat profil ${user.name}`}
                >
                  <UserAvatar src={user.avatarUrl} name={user.name} seed={user.id} size="sm" />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => openProfile(user.id)}
                    className="block w-full truncate text-left text-sm font-medium hover:underline"
                  >
                    {user.name}
                  </button>
                  <p className="text-muted-foreground truncate text-xs">
                    {user.mutualFriends > 0
                      ? `${user.mutualFriends} teman bersama`
                      : user.bio || `@${user.username}`}
                  </p>
                  <Button
                    size="sm"
                    variant={sentIds.has(user.id) ? "secondary" : "outline"}
                    className="mt-1.5 h-7 px-2.5 text-xs"
                    onClick={() => sendRequest(user.id)}
                    disabled={sendRequestMutation.isPending || sentIds.has(user.id)}
                  >
                    {sentIds.has(user.id) ? "Terkirim" : "Tambah"}
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
