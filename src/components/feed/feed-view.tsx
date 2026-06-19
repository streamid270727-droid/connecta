"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { PostComposerInline } from "@/components/feed/post-composer-inline"
import { StoriesBar } from "@/components/stories/stories-bar"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Sparkles, Users } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

export function FeedView() {
  const { data: session } = useSession()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [scope, setScope] = useState<"friends" | "discover">("friends")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const loadingRef = useRef(false)

  const loadFeed = useCallback(async (resetCursor?: boolean) => {
    if (loadingRef.current) return
    if (resetCursor) {
      setLoading(true)
      setError(null)
    } else {
      setLoadingMore(true)
    }
    loadingRef.current = true
    try {
      const url = `/api/posts?scope=${scope}&limit=10${
        !resetCursor && cursor ? `&cursor=${cursor}` : ""
      }`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Gagal memuat feed")
      const data = await res.json()
      if (resetCursor) {
        setPosts(data.posts)
      } else {
        setPosts((prev) => {
          const ids = new Set(prev.map((p) => p.id))
          const merged = [...prev, ...data.posts.filter((p: FeedPost) => !ids.has(p.id))]
          return merged
        })
      }
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (e: any) {
      setError(e.message)
      toast({
        title: "Gagal memuat feed",
        description: e.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [cursor, scope, toast])

  useEffect(() => {
    setPosts([])
    setCursor(null)
    setHasMore(true)
    void loadFeed(true)
  }, [scope])

  // Infinite scroll
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

  const handleNewPost = (post: FeedPost) => {
    setPosts((prev) => [post, ...prev])
  }

  const handlePostUpdate = (id: string, updates: Partial<FeedPost>) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const handlePostDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="min-h-screen">
      {/* Hero / greeting */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-purple-600 p-5 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
            <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-amber-300/40 blur-2xl" />
          </div>
          <div className="relative flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/30">
              <Sparkles className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">
                Halo, {session?.user?.name?.split(" ")[0]}! 👋
              </h1>
              <p className="text-sm text-white/80">
                Apa yang ingin Anda bagikan hari ini?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="px-4 sm:px-6 py-2 sticky top-14 sm:top-16 z-20 bg-background/80 glass">
        <div className="flex gap-2">
          <Button
            variant={scope === "friends" ? "default" : "ghost"}
            size="sm"
            className={scope === "friends" ? "" : "text-muted-foreground"}
            onClick={() => setScope("friends")}
          >
            <Users className="size-4" />
            Teman
          </Button>
          <Button
            variant={scope === "discover" ? "default" : "ghost"}
            size="sm"
            className={scope === "discover" ? "" : "text-muted-foreground"}
            onClick={() => setScope("discover")}
          >
            <Sparkles className="size-4" />
            Jelajahi
          </Button>
        </div>
      </div>

      <div className="px-2 sm:px-4 py-2 space-y-3 sm:space-y-4">
        <StoriesBar />
        <PostComposerInline onPosted={handleNewPost} />

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostSkeleton key={i} />
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
          <EmptyFeed scope={scope} />
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

function PostSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-32 rounded bg-muted animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-muted animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-48 rounded-xl bg-muted animate-pulse" />
      <div className="flex gap-4 pt-2">
        <div className="h-6 w-16 rounded bg-muted animate-pulse" />
        <div className="h-6 w-16 rounded bg-muted animate-pulse" />
        <div className="h-6 w-16 rounded bg-muted animate-pulse" />
      </div>
    </div>
  )
}

function EmptyFeed({ scope }: { scope: "friends" | "discover" }) {
  const setView = useAppStore((s) => s.setView)
  return (
    <div className="text-center py-16 px-4">
      <div className="size-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-950/30 dark:to-pink-950/30 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="size-10 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-1">
        {scope === "friends" ? "Feed Anda kosong" : "Belum ada postingan"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        {scope === "friends"
          ? "Mulai dengan menambahkan teman atau buat postingan pertama Anda."
          : "Jadilah yang pertama memposting sesuatu untuk dilihat semua orang."}
      </p>
      <div className="flex gap-2 justify-center">
        {scope === "friends" && (
          <Button onClick={() => setView("friends")} variant="outline">
            <Users className="size-4" />
            Cari Teman
          </Button>
        )}
        <Button onClick={() => setView("discover")}>
          <Sparkles className="size-4" />
          Jelajahi Postingan
        </Button>
      </div>
    </div>
  )
}
