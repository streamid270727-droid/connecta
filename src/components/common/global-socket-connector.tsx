"use client"

import { useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { getSocket } from "@/lib/socket"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"
import { CheckCheck } from "lucide-react"

/**
 * Maintains a persistent socket connection for the authenticated user,
 * listens for incoming messages, typing indicators, and notifications.
 */
export function GlobalSocketConnector() {
  const { data: session } = useSession()
  const setUnreadMessages = useAppStore((s) => s.setUnreadMessages)
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications)
  const conversationTarget = useAppStore((s) => s.conversationTarget)
  const currentView = useAppStore((s) => s.currentView)
  const toastShownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!session?.user?.id) return
    const socket = getSocket()

    const handleConnect = () => {
      socket.emit("user:online", {
        userId: session.user.id,
        name: session.user.name,
        username: session.user.username,
        avatarUrl: session.user.image,
      })
    }

    if (socket.connected) {
      handleConnect()
    }
    socket.on("connect", handleConnect)

    // Incoming direct message
    socket.on("dm:message", (msg: any) => {
      // If user is currently in this conversation, don't toast
      if (
        currentView === "messages" &&
        conversationTarget?.otherUserId === msg.senderId
      ) {
        return
      }
      // Avoid duplicate toasts
      if (toastShownRef.current.has(msg.id)) return
      toastShownRef.current.add(msg.id)
      // Clean up old toasts
      if (toastShownRef.current.size > 50) {
        toastShownRef.current.clear()
      }
      setUnreadMessages(0) // will be re-fetched
      void refreshMessageCount()
      toast(`Pesan baru dari ${msg.senderName}`, {
        description: msg.content,
        action: {
          label: "Lihat",
          onClick: () => {
            useAppStore.getState().openConversation(msg.conversationId, msg.senderId)
          },
        },
      })
    })

    // New notification (like/comment/friend)
    socket.on("notif:new", (data: any) => {
      if (data.recipientId !== session.user.id) return
      setUnreadNotifications(0)
      void refreshNotifCount()
      toast(data.title || "Notifikasi baru", {
        description: data.body,
        action: {
          label: "Lihat",
          onClick: () => useAppStore.getState().setView("notifications"),
        },
      })
    })

    return () => {
      socket.off("connect", handleConnect)
      socket.off("dm:message")
      socket.off("notif:new")
    }
  }, [session?.user?.id, currentView, conversationTarget?.otherUserId])

  return null
}

async function refreshMessageCount() {
  try {
    const res = await fetch("/api/conversations?unread=1")
    if (res.ok) {
      const data = await res.json()
      useAppStore.getState().setUnreadMessages(data.unreadCount || 0)
    }
  } catch {}
}
async function refreshNotifCount() {
  try {
    const res = await fetch("/api/notifications?count=1")
    if (res.ok) {
      const data = await res.json()
      useAppStore.getState().setUnreadNotifications(data.unreadCount || 0)
    }
  } catch {}
}
