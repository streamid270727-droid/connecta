import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface StoryGroup {
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    isVerified: boolean
  }
  stories: {
    id: string
    mediaUrl: string | null
    content: string | null
    bgColor: string | null
    textColor: string | null
    createdAt: Date
    expiresAt: Date
    views: { viewerId: string }[]
    _count: { views: number }
  }[]
  hasUnviewed: boolean
}

export function useStories() {
  return useQuery({
    queryKey: ["stories"],
    queryFn: async (): Promise<StoryGroup[]> => {
      const res = await fetch("/api/stories")
      if (!res.ok) throw new Error("Gagal memuat stories")
      const data = await res.json()
      return data.groups
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useCreateStory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      content?: string
      mediaUrl?: string
      bgColor?: string
      textColor?: string
    }) => {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Gagal membuat story")
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stories"] })
    },
  })
}
