"use client"

import { useState, useEffect, useRef } from "react"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { PostComposerInline } from "@/components/feed/post-composer-inline"
import { StoriesBar } from "@/components/stories/stories-bar"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Globe, Users } from "lucide-react"
import { useFeed } from "@/hooks/api/use-feed"
import { useQueryClient } from "@tanstack/react-query"
import { EmptyState, EndOfContent } from "@/components/common/empty-state"

export function FeedView() {
  const [scope, setScope] = useState<"all" | "friends">("all")
  const qc = useQueryClient()
  const feedQuery = useFeed(scope)
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = feedQuery

  const posts = data?.pages.flatMap((p) => p.posts) ?? []

  // Infinite scroll
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

  // Reset on scope change handled by query key change
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [scope])

  const handleNewPost = (post: FeedPost) => {
    qc.setQueryData(["feed", scope], (old: any) => {
      if (!old) return old
      return {
        ...old,
        pages: [
          { posts: [post, ...old.pages[0].posts], nextCursor: old.pages[0].nextCursor },
          ...old.pages.slice(1),
        ],
      }
    })
  }

  const handlePostUpdate = (id: string, updates: Partial<FeedPost>) => {
    qc.setQueryData(["feed", scope], (old: any) => {
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
    qc.setQueryData(["feed", scope], (old: any) => {
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
      <div className="space-y-3 px-2 py-2 sm:space-y-4 sm:px-4">
        <StoriesBar />
        <PostComposerInline onPosted={handleNewPost} />

        <div className="flex gap-2">
          <Button
            variant={scope === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("all")}
            className="flex-1"
          >
            <Globe className="mr-1 size-4" />
            Semua
          </Button>
          <Button
            variant={scope === "friends" ? "default" : "outline"}
            size="sm"
            onClick={() => setScope("friends")}
            className="flex-1"
          >
            <Users className="mr-1 size-4" />
            Teman
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <PostSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={<RefreshCw className="size-10" />}
            title="Gagal memuat"
            description="Terjadi kesalahan saat memuat feed"
            action={
              <Button onClick={() => feedQuery.refetch()} variant="outline" size="sm">
                <RefreshCw className="size-4" />
                Coba lagi
              </Button>
            }
          />
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

function PostSkeleton() {
  return (
    <div className="bg-card space-y-3 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted size-10 animate-pulse rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
          <div className="bg-muted h-2.5 w-20 animate-pulse rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-3 w-full animate-pulse rounded" />
        <div className="bg-muted h-3 w-4/5 animate-pulse rounded" />
      </div>
      <div className="bg-muted h-48 animate-pulse rounded-xl" />
      <div className="flex gap-4 pt-2">
        <div className="bg-muted h-6 w-16 animate-pulse rounded" />
        <div className="bg-muted h-6 w-16 animate-pulse rounded" />
        <div className="bg-muted h-6 w-16 animate-pulse rounded" />
      </div>
    </div>
  )
}

function EmptyFeed({ scope }: { scope: "all" | "friends" }) {
  return (
    <EmptyState
      icon={scope === "friends" ? <Users className="size-10" /> : <Globe className="size-10" />}
      title={scope === "friends" ? "Belum ada postingan dari teman" : "Belum ada postingan"}
      description={
        scope === "friends"
          ? "Teman Anda belum memposting sesuatu. Coba lihat feed semua orang."
          : "Jadilah yang pertama memposting sesuatu untuk dilihat semua orang."
      }
    />
  )
}
