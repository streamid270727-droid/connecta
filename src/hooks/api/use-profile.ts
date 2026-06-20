import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

interface ProfileUser {
  id: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  location: string | null
  phone: string | null
  birthDate: string | null
  isPrivate: boolean
  isVerified: boolean
  role: string
  createdAt: string
  isOwnProfile: boolean
  isFriend: boolean
  friendRequestSent: boolean
  friendRequestReceived: boolean
  requestId: string | null
  friendsCount: number
  postsCount: number
  mutualFriends?: number
}

interface ProfilePost {
  id: string
  content: string
  images: string[]
  videoUrl: string | null
  linkPreview?: any
  createdAt: string
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    isVerified: boolean
  }
  liked: boolean
  emoji?: string | null
  reactionSummary?: { emoji: string; count: number }[]
  shared: boolean
  saved?: boolean
  _count: { likes: number; comments: number; shares: number }
  sharedFrom?: any
}

interface ProfileResponse {
  user: ProfileUser
  friends: any[]
  posts: ProfilePost[]
  nextCursor: string | null
}

export function useProfile(targetId: string | undefined) {
  return useQuery({
    queryKey: ["profile", targetId],
    queryFn: async (): Promise<ProfileResponse> => {
      const res = await fetch(`/api/users/${targetId}`)
      if (!res.ok) throw new Error("Gagal memuat profil")
      return res.json()
    },
    enabled: !!targetId,
    staleTime: 10_000,
  })
}

export function useProfilePosts(targetId: string | undefined, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["profilePosts", targetId],
    queryFn: async ({
      pageParam,
    }: {
      pageParam: string | null
    }): Promise<{ posts: ProfilePost[]; nextCursor: string | null }> => {
      const url = pageParam
        ? `/api/users/${targetId}?cursor=${pageParam}`
        : `/api/users/${targetId}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Gagal memuat postingan")
      return res.json()
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && !!targetId,
    staleTime: 10_000,
  })
}

export function useProfilePhotos(targetId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["profilePhotos", targetId],
    queryFn: async (): Promise<string[]> => {
      const res = await fetch(`/api/users/${targetId}/photos`)
      if (!res.ok) return []
      const data = await res.json()
      return data.photos || []
    },
    enabled: enabled && !!targetId,
    staleTime: 30_000,
  })
}

export function useSavedPosts() {
  return useQuery({
    queryKey: ["savedPosts"],
    queryFn: async (): Promise<ProfilePost[]> => {
      const res = await fetch("/api/posts/saved")
      if (!res.ok) throw new Error("Gagal memuat postingan tersimpan")
      const data = await res.json()
      return data.posts || []
    },
    staleTime: 10_000,
  })
}

export function useUnsavePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (postId: string) => {
      const res = await fetch(`/api/posts/${postId}/save`, { method: "POST" })
      if (!res.ok) throw new Error("Gagal")
      return res.json()
    },
    onMutate: async (postId) => {
      await qc.cancelQueries({ queryKey: ["savedPosts"] })
      const prev = qc.getQueryData<ProfilePost[]>(["savedPosts"])
      qc.setQueryData<ProfilePost[]>(["savedPosts"], (old) => old?.filter((p) => p.id !== postId))
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["savedPosts"], context.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["savedPosts"] })
    },
  })
}

export function useBlockUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch("/api/friends/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error("Gagal")
      return res.json() as Promise<{ blocked: boolean }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] })
    },
  })
}

export type { ProfileUser, ProfilePost, ProfileResponse }
