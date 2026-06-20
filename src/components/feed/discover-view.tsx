"use client"

import { useEffect } from "react"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Globe, TrendingUp } from "lucide-react"
import { useDiscoverFeed } from "@/hooks/api/use-feed"
import { useQueryClient } from "@tanstack/react-query"
import { EmptyState, EndOfContent } from "@/components/common/empty-state"

export function DiscoverView() {
  const qc = useQueryClient()
  const feedQuery = useDiscoverFeed()
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  useEffect(() => {
    const handler = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage()
      }
    }
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handlePostUpdate = (id: string, updates: Partial<FeedPost>) => {
    qc.setQueryData(["feed", "discover"], (old: any) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: FeedPost) => (p.id === id ? { ...p, ...updates } : p)),
        })),
      }
    })
  }
  const handlePostDelete = (id: string) => {
    qc.setQueryData(["feed", "discover"], (old: any) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          posts: page.posts.filter((p: FeedPost) => p.id !== id),
        })),
      }
    })
  }

  return (
    <div className="min-h-screen">
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <div className="mb-1 flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600">
            <TrendingUp className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Jelajahi</h1>
            <p className="text-muted-foreground text-xs">
              Postingan terbaru dari semua pengguna Connecta
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-2 py-2 sm:space-y-4 sm:px-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <DiscoverSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<RefreshCw className="size-10" />}
            title="Gagal memuat"
            description="Terjadi kesalahan saat memuat postingan"
            action={
              <Button onClick={() => feedQuery.refetch()} variant="outline" size="sm">
                <RefreshCw className="size-4" />
                Coba lagi
              </Button>
            }
          />
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<Globe className="size-10" />}
            title="Belum ada postingan"
            description="Belum ada postingan untuk dijelajahi"
          />
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
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="text-muted-foreground size-6 animate-spin" />
              </div>
            )}
            {!hasNextPage && posts.length > 0 && (
              <EndOfContent
                icon={<Globe className="size-5" />}
                text="Itulah semua untuk sekarang"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DiscoverSkeleton() {
  return (
    <div className="bg-card space-y-3 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted size-10 animate-pulse rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
          <div className="bg-muted h-2.5 w-20 animate-pulse rounded" />
        </div>
      </div>
      <div className="bg-muted h-32 animate-pulse rounded-xl" />
      <div className="flex gap-4 pt-2">
        <div className="bg-muted h-6 w-16 animate-pulse rounded" />
        <div className="bg-muted h-6 w-16 animate-pulse rounded" />
        <div className="bg-muted h-6 w-16 animate-pulse rounded" />
      </div>
    </div>
  )
}
