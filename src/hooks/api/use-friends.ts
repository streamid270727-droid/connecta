import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Friend {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  bio: string | null
  isVerified: boolean
  friendedAt?: string
}

interface FriendRequest {
  id: string
  senderId: string
  createdAt: string
  sender: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    bio: string | null
    isVerified: boolean
  }
}

interface Suggestion {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  bio: string | null
  mutualFriends: number
}

export function useFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: async (): Promise<Friend[]> => {
      const res = await fetch("/api/friends")
      if (!res.ok) throw new Error("Gagal memuat teman")
      const data = await res.json()
      return data.friends || []
    },
    staleTime: 30_000,
  })
}

export function useFriendRequests() {
  return useQuery({
    queryKey: ["friendRequests"],
    queryFn: async (): Promise<FriendRequest[]> => {
      const res = await fetch("/api/friends/requests")
      if (!res.ok) throw new Error("Gagal memuat permintaan")
      const data = await res.json()
      return data.requests || []
    },
    staleTime: 10_000,
  })
}

export function useFriendSuggestions() {
  return useQuery({
    queryKey: ["friendSuggestions"],
    queryFn: async (): Promise<Suggestion[]> => {
      const res = await fetch("/api/friends/suggestions")
      if (!res.ok) throw new Error("Gagal memuat saran")
      const data = await res.json()
      return data.suggestions || []
    },
    staleTime: 60_000,
  })
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Gagal menerima")
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendRequests"] })
      qc.invalidateQueries({ queryKey: ["friends"] })
      qc.invalidateQueries({ queryKey: ["friendSuggestions"] })
    },
  })
}

export function useRejectFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (requestId: string) => {
      const res = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Gagal menolak")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendRequests"] })
    },
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (recipientId: string) => {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Gagal mengirim")
      return data as { status: "pending" | "friends" }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendSuggestions"] })
    },
  })
}

export function useUnfriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/friends/${userId}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Gagal")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] })
      qc.invalidateQueries({ queryKey: ["friendSuggestions"] })
    },
  })
}

export type { Friend, FriendRequest, Suggestion }
