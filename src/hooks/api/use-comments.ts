import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface Comment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    isVerified: boolean
  }
  liked: boolean
  likeCount: number
  replies?: Comment[]
}

async function fetchComments(postId: string): Promise<Comment[]> {
  const res = await fetch(`/api/posts/${postId}/comments`)
  if (!res.ok) throw new Error("Gagal memuat komentar")
  const data = await res.json()
  return data.comments
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ["comments", postId],
    queryFn: () => fetchComments(postId),
    staleTime: 10_000,
  })
}

export function useCreateComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal mengirim komentar")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}

export function useCreateReply(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ parentId, content }: { parentId: string; content: string }) => {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal mengirim balasan")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}

export function useToggleCommentLike(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" })
      if (!res.ok) throw new Error("Gagal")
      return res.json()
    },
    onMutate: async (commentId) => {
      await qc.cancelQueries({ queryKey: ["comments", postId] })
      const prev = qc.getQueryData<Comment[]>(["comments", postId])
      qc.setQueryData<Comment[]>(["comments", postId], (old) =>
        old?.map((c) => {
          if (c.id === commentId) {
            return { ...c, liked: !c.liked, likeCount: c.liked ? c.likeCount - 1 : c.likeCount + 1 }
          }
          return {
            ...c,
            replies: c.replies?.map((r) =>
              r.id === commentId
                ? { ...r, liked: !r.liked, likeCount: r.liked ? r.likeCount - 1 : r.likeCount + 1 }
                : r
            ),
          }
        })
      )
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["comments", postId], context.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}

export function useEditComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Gagal mengedit komentar")
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Gagal menghapus komentar")
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", postId] })
    },
  })
}
