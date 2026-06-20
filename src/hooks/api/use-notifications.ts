import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

interface NotificationActor {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified?: boolean
}

interface AppNotification {
  id: string
  recipientId: string
  actorId: string | null
  type: string
  entityId: string | null
  content: string | null
  isRead: boolean
  createdAt: string
  actor: NotificationActor | null
}

interface NotificationsResponse {
  notifications: AppNotification[]
  nextCursor: string | null
}

async function fetchNotifications(cursor?: string): Promise<NotificationsResponse> {
  const url = cursor ? `/api/notifications?cursor=${cursor}` : "/api/notifications"
  const res = await fetch(url)
  if (!res.ok) throw new Error("Gagal memuat notifikasi")
  return res.json()
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    staleTime: 10_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, { method: "POST" })
      if (!res.ok) throw new Error("Gagal menandai dibaca")
    },
    onMutate: async (notificationId) => {
      await qc.cancelQueries({ queryKey: ["notifications"] })
      const prev = qc.getQueryData<NotificationsResponse>(["notifications"])
      qc.setQueryData<NotificationsResponse>(["notifications"], (old) => {
        if (!old) return old
        return {
          ...old,
          notifications: old.notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n
          ),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["notifications"], context.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read-all", { method: "POST" })
      if (!res.ok) throw new Error("Gagal menandai dibaca")
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["notifications"] })
      const prev = qc.getQueryData<NotificationsResponse>(["notifications"])
      qc.setQueryData<NotificationsResponse>(["notifications"], (old) => {
        if (!old) return old
        return {
          ...old,
          notifications: old.notifications.map((n) => ({ ...n, isRead: true })),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(["notifications"], context.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export type { AppNotification, NotificationActor }
