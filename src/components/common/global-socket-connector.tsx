"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { getSocket } from "@/lib/socket"
import { useAppStore } from "@/lib/store"
import { toast } from "sonner"

/**
 * Maintains a persistent socket connection for the authenticated user,
 * listens for incoming messages, typing indicators, and notifications.
 */
export function GlobalSocketConnector() {
  const { data: session } = useSession()
  const conversationTarget = useAppStore((s) => s.conversationTarget)
  const currentView = useAppStore((s) => s.currentView)
  const toastShownRef = useRef<Set<string>>(new Set())
  const notifPermissionRef = useRef(false)

  // Use refs for values that should not cause re-registration of socket listeners
  const currentViewRef = useRef(currentView)
  const conversationTargetRef = useRef(conversationTarget)
  useEffect(() => { currentViewRef.current = currentView }, [currentView])
  useEffect(() => { conversationTargetRef.current = conversationTarget }, [conversationTarget])

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        notifPermissionRef.current = perm === "granted"
      })
    } else if ("Notification" in window && Notification.permission === "granted") {
      notifPermissionRef.current = true
    }
  }, [])

  const showBrowserNotification = useCallback((title: string, body: string, onClick?: () => void) => {
    if (!notifPermissionRef.current) return
    // Only show if tab is not visible
    if (document.visibilityState === "visible") return
    const n = new Notification(title, { body, icon: "/connecta_logo.png" })
    if (onClick) {
      n.onclick = () => {
        window.focus()
        onClick()
        n.close()
      }
    }
  }, [])

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
        currentViewRef.current === "messages" &&
        conversationTargetRef.current?.otherUserId === msg.senderId
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
      // Optimistic increment instead of reset to avoid flicker
      const current = useAppStore.getState().unreadMessages
      useAppStore.getState().setUnreadMessages(current + 1)
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
      showBrowserNotification(
        `Pesan baru dari ${msg.senderName}`,
        msg.content,
        () => useAppStore.getState().openConversation(msg.conversationId, msg.senderId)
      )
    })

    // New notification (like/comment/friend)
    socket.on("notif:new", (data: any) => {
      if (data.recipientId !== session.user.id) return
      // Optimistic increment instead of reset to avoid flicker
      const current = useAppStore.getState().unreadNotifications
      useAppStore.getState().setUnreadNotifications(current + 1)
      void refreshNotifCount()
      toast(data.title || "Notifikasi baru", {
        description: data.body,
        action: {
          label: "Lihat",
          onClick: () => useAppStore.getState().setView("notifications"),
        },
      })
      showBrowserNotification(
        data.title || "Notifikasi baru",
        data.body,
        () => useAppStore.getState().setView("notifications")
      )
    })

    return () => {
      socket.off("connect", handleConnect)
      socket.off("dm:message")
      socket.off("notif:new")
    }
  }, [session?.user?.id])

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
