import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/lib/store"
import { useEffect } from "react"

async function fetchCounts() {
  const [notifRes, msgRes, friendRes] = await Promise.all([
    fetch("/api/notifications?count=1"),
    fetch("/api/conversations?unread=1"),
    fetch("/api/friends/requests?count=1"),
  ])

  const [notifData, msgData, friendData] = await Promise.all([
    notifRes.ok ? notifRes.json() : Promise.resolve(null),
    msgRes.ok ? msgRes.json() : Promise.resolve(null),
    friendRes.ok ? friendRes.json() : Promise.resolve(null),
  ])

  return {
    unreadNotifications: notifData?.unreadCount || 0,
    unreadMessages: msgData?.unreadCount || 0,
    pendingFriendRequests: friendData?.count || 0,
  }
}

export function useUnreadCounts(enabled: boolean) {
  const query = useQuery({
    queryKey: ["unreadCounts"],
    queryFn: fetchCounts,
    refetchInterval: 30_000,
    enabled,
    staleTime: 10_000,
  })

  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications)
  const setUnreadMessages = useAppStore((s) => s.setUnreadMessages)
  const setPendingFriendRequests = useAppStore((s) => s.setPendingFriendRequests)

  useEffect(() => {
    if (query.data) {
      setUnreadNotifications(query.data.unreadNotifications)
      setUnreadMessages(query.data.unreadMessages)
      setPendingFriendRequests(query.data.pendingFriendRequests)
    }
  }, [query.data, setUnreadNotifications, setUnreadMessages, setPendingFriendRequests])

  return query
}
