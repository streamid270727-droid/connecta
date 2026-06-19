"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Sparkles, TrendingUp } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DiscoverView() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const loadingRef = useRef(false)

  const loadFeed = useCallback(
    async (resetCursor?: boolean) => {
      if (loadingRef.current) return
      if (resetCursor) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }
      loadingRef.current = true
      try {
        const url = `/api/posts?scope=discover&limit=10${
          !resetCursor && cursor ? `&cursor=${cursor}` : ""
        }`
        const res = await fetch(url)
        if (!res.ok) throw new Error("Gagal memuat")
        const data = await res.json()
        if (resetCursor) {
          setPosts(data.posts)
        } else {
          setPosts((prev) => {
            const ids = new Set(prev.map((p) => p.id))
            return [...prev, ...data.posts.filter((p: FeedPost) => !ids.has(p.id))]
          })
        }
        setCursor(data.nextCursor)
        setHasMore(!!data.nextCursor)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
        setLoadingMore(false)
        loadingRef.current = false
      }
    },
    [cursor]
  )

  useEffect(() => {
    setPosts([])
    setCursor(null)
    setHasMore(true)
    void loadFeed(true)
  }, [])

  useEffect(() => {
    const handler = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 800 &&
        hasMore &&
        !loadingMore &&
        !loading
      ) {
        void loadFeed(false)
      }
    }
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [hasMore, loadingMore, loading, loadFeed])

  const handlePostUpdate = (id: string, updates: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }
  const handlePostDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="size-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <TrendingUp className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Jelajahi</h1>
            <p className="text-xs text-muted-foreground">
              Postingan terbaru dari semua pengguna Connecta
            </p>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 py-2 space-y-3 sm:space-y-4">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <DiscoverSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadFeed(true)} variant="outline">
              <RefreshCw className="size-4" />
              Coba lagi
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="size-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Belum ada postingan untuk dijelajahi</p>
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onUpdate={handlePostUpdate}
                onDelete={handlePostDelete}
              />
            ))}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Sparkles className="size-5 mx-auto mb-2 opacity-50" />
                Itulah semua untuk sekarang
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DiscoverSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-32 rounded-xl bg-muted animate-pulse" />
      <div className="flex gap-4 pt-2">
        <div className="h-6 w-16 rounded bg-muted animate-pulse" />
        <div className="h-6 w-16 rounded bg-muted animate-pulse" />
        <div className="h-6 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}
