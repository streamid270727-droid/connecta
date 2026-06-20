import { useInfiniteQuery } from "@tanstack/react-query"
import type { FeedPost } from "@/components/feed/post-card"

interface FeedPage {
  posts: FeedPost[]
  nextCursor: string | null
}

async function fetchFeed(scope: string, cursor?: string | null): Promise<FeedPage> {
  const url = `/api/posts?scope=${scope}&limit=10${cursor ? `&cursor=${cursor}` : ""}`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Gagal memuat feed")
  return res.json()
}

export function useFeed(scope: "all" | "friends") {
  return useInfiniteQuery({
    queryKey: ["feed", scope] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) => fetchFeed(scope, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}

export function useDiscoverFeed() {
  return useInfiniteQuery({
    queryKey: ["feed", "discover"] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) => fetchFeed("discover", pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: FeedPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}
