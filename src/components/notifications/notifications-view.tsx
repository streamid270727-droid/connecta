"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { getSocket } from "@/lib/socket"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from "@/hooks/api/use-notifications"
import { useQueryClient } from "@tanstack/react-query"
import { EmptyState } from "@/components/common/empty-state"
import {
  AlertCircle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  CornerDownRight,
  Heart,
  Loader2,
  Mail,
  MessageCircle,
  RefreshCw,
  Share2,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

type TabValue = "all" | "unread"
type DateGroupKey = "today" | "yesterday" | "older"

function startOfDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a) === startOfDay(b)
}

function isYesterday(a: Date, b: Date): boolean {
  const yesterday = new Date(b)
  yesterday.setDate(yesterday.getDate() - 1)
  return isSameDay(a, yesterday)
}

function dateGroupKey(date: Date): DateGroupKey {
  const now = new Date()
  if (isSameDay(date, now)) return "today"
  if (isYesterday(date, now)) return "yesterday"
  return "older"
}

const DATE_GROUP_LABEL: Record<DateGroupKey, string> = {
  today: "Hari Ini",
  yesterday: "Kemarin",
  older: "Lebih Lama",
}

const DATE_GROUP_ORDER: DateGroupKey[] = ["today", "yesterday", "older"]

interface TypeConfig {
  Icon: LucideIcon
  bg: string
  fg: string
  label: string
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  like: { Icon: Heart, bg: "bg-rose-500 dark:bg-rose-600/80", fg: "text-white", label: "Suka" },
  comment: {
    Icon: MessageCircle,
    bg: "bg-emerald-500 dark:bg-emerald-600/80",
    fg: "text-white",
    label: "Komentar",
  },
  reply: {
    Icon: CornerDownRight,
    bg: "bg-amber-500 dark:bg-amber-600/80",
    fg: "text-white",
    label: "Balasan",
  },
  share: {
    Icon: Share2,
    bg: "bg-violet-500 dark:bg-violet-600/80",
    fg: "text-white",
    label: "Bagikan",
  },
  friend_request: {
    Icon: UserPlus,
    bg: "bg-sky-500 dark:bg-sky-600/80",
    fg: "text-white",
    label: "Permintaan teman",
  },
  friend_accept: {
    Icon: UserCheck,
    bg: "bg-emerald-500 dark:bg-emerald-600/80",
    fg: "text-white",
    label: "Teman diterima",
  },
  message: { Icon: Mail, bg: "bg-primary", fg: "text-primary-foreground", label: "Pesan" },
}

export function NotificationsView() {
  const { data: session } = useSession()
  const { openProfile, openConversation, setView, setUnreadNotifications } = useAppStore()
  const { toast } = useToast()
  const qc = useQueryClient()

  const [activeTab, setActiveTab] = useState<TabValue>("all")

  const notifQuery = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = notifQuery.data?.notifications ?? []

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications])

  // Sync unread count to store
  useEffect(() => {
    if (!notifQuery.isLoading) {
      setUnreadNotifications(unreadCount)
    }
  }, [unreadCount, notifQuery.isLoading, setUnreadNotifications])

  // Real-time: listen for new notifications via socket
  const notificationsRef = useRef(notifications)
  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  useEffect(() => {
    const socket = getSocket()
    const handleNewNotif = (data: any) => {
      if (!data || data.recipientId !== session?.user?.id) return
      const newNotif: AppNotification = {
        id: data.id || `temp-${Date.now()}`,
        type: data.type || "like",
        recipientId: data.recipientId,
        actorId: data.actorId || null,
        actor: data.actor || null,
        entityId: data.entityId || null,
        content: data.body || data.content || "",
        isRead: false,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<any>(["notifications"], (old: any) => {
        if (!old) return old
        if (old.notifications.some((n: any) => n.id === newNotif.id)) return old
        return { ...old, notifications: [newNotif, ...old.notifications] }
      })
      setUnreadNotifications(notificationsRef.current.filter((n) => !n.isRead).length + 1)
    }
    socket.on("notif:new", handleNewNotif)
    return () => {
      socket.off("notif:new", handleNewNotif)
    }
  }, [session?.user?.id, setUnreadNotifications, qc])

  const navigateForType = useCallback(
    (n: AppNotification) => {
      if (!n.actor) return
      switch (n.type) {
        case "friend_request":
          setView("friends")
          break
        case "friend_accept":
          openProfile(n.actor.id)
          break
        case "message":
          openConversation("", n.actor.id)
          break
        default:
          break
      }
    },
    [openConversation, openProfile, setView]
  )

  const handleNotificationClick = (n: AppNotification) => {
    navigateForType(n)
    if (!n.isRead && !markRead.isPending) {
      markRead.mutate(n.id)
    }
  }

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return
    markAllRead.mutate(undefined, {
      onSuccess: () =>
        toast({ title: "Berhasil", description: "Semua notifikasi ditandai dibaca" }),
      onError: (e) => toast({ title: "Gagal", description: e.message, variant: "destructive" }),
    })
  }

  const grouped = useMemo(() => {
    const filtered = activeTab === "unread" ? notifications.filter((n) => !n.isRead) : notifications
    const groups: Record<DateGroupKey, AppNotification[]> = { today: [], yesterday: [], older: [] }
    for (const n of filtered) {
      groups[dateGroupKey(new Date(n.createdAt))].push(n)
    }
    return groups
  }, [notifications, activeTab])

  const visibleGroups = DATE_GROUP_ORDER.filter((k) => grouped[k].length > 0)
  const visibleCount = activeTab === "unread" ? unreadCount : notifications.length

  return (
    <div className="min-h-screen pb-8">
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/30">
            <Bell className="size-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">Notifikasi</h1>
            <p className="text-muted-foreground text-xs">
              {notifications.length} notifikasi
              {unreadCount > 0 && (
                <>
                  {" · "}
                  <span className="text-primary font-medium">{unreadCount} belum dibaca</span>
                </>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="h-8 shrink-0"
            >
              {markAllRead.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              <span className="hidden sm:inline">Tandai semua dibaca</span>
              <span className="sm:hidden">Tandai</span>
            </Button>
          )}
        </div>
      </div>

      <div className="bg-background/80 glass sticky top-14 z-30 border-b sm:top-16">
        <div className="px-2 sm:px-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="w-full"
          >
            <TabsList className="h-12 w-full justify-start gap-1 rounded-none bg-transparent p-0">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex-1 rounded-lg transition-all data-[state=active]:shadow-sm sm:flex-none sm:px-5"
              >
                <Bell className="size-4" />
                Semua
                {notifications.length > 0 && (
                  <span className="bg-secondary text-secondary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                    {notifications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex-1 rounded-lg transition-all data-[state=active]:shadow-sm sm:flex-none sm:px-5"
              >
                <BellOff className="size-4" />
                Belum Dibaca
                {unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="px-2 py-4 sm:px-4">
        {notifQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationRowSkeleton key={i} />
            ))}
          </div>
        ) : notifQuery.error ? (
          <ErrorState message="Gagal memuat notifikasi" onRetry={() => notifQuery.refetch()} />
        ) : visibleCount === 0 ? (
          <NotificationsEmptyState activeTab={activeTab} />
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((groupKey) => (
              <section key={groupKey}>
                <h2 className="text-muted-foreground mb-2 px-1 text-[11px] font-semibold tracking-wider uppercase">
                  {DATE_GROUP_LABEL[groupKey]}
                </h2>
                <div className="space-y-2">
                  {grouped[groupKey].map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onClick={() => handleNotificationClick(n)}
                      onViewActor={() => n.actor && openProfile(n.actor.id)}
                      busy={markRead.isPending}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationCard({
  notification,
  onClick,
  onViewActor,
  busy,
}: {
  notification: AppNotification
  onClick: () => void
  onViewActor: () => void
  busy: boolean
}) {
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.like
  const { actor } = notification
  const isUnread = !notification.isRead
  const displayName = actor?.name ?? "Seseorang"

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "border-border/60 hover:border-primary/30 focus-visible:ring-ring/50 flex cursor-pointer items-start gap-3 p-3 transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none sm:gap-4 sm:p-4",
        isUnread && "bg-primary/5 border-primary/20"
      )}
    >
      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewActor()
          }}
          className="block rounded-full"
        >
          {actor ? (
            <UserAvatar
              src={actor.avatarUrl}
              name={actor.name}
              seed={actor.id}
              size="lg"
              className="ring-border ring-1"
            />
          ) : (
            <div className="bg-muted text-muted-foreground ring-border flex size-12 items-center justify-center rounded-full ring-1">
              <UserPlus className="size-5" />
            </div>
          )}
        </button>
        <div
          className={cn(
            "ring-background absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full ring-2",
            cfg.bg,
            cfg.fg
          )}
        >
          <cfg.Icon className="size-3" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-relaxed break-words">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onViewActor()
                }}
                className="font-semibold hover:underline"
              >
                {displayName}
                {actor?.isVerified && (
                  <CheckCircle2 className="text-primary ml-1 inline-block size-3.5 align-text-bottom" />
                )}
              </button>
              {notification.content && (
                <>
                  <span className="text-foreground/90"> {notification.content}</span>
                </>
              )}
            </p>
            <div className="text-muted-foreground mt-1 text-[11px]">
              {formatRelativeTime(notification.createdAt)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {busy && <Loader2 className="text-muted-foreground size-3.5 animate-spin" />}
            {isUnread && (
              <span className="bg-primary shadow-primary/40 size-2.5 rounded-full shadow-sm" />
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function NotificationRowSkeleton() {
  return (
    <Card className="border-border/60 flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
      <div className="relative shrink-0">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="ring-background absolute -right-1 -bottom-1 size-5 rounded-full ring-2" />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </Card>
  )
}

function NotificationsEmptyState({ activeTab }: { activeTab: TabValue }) {
  const isUnreadTab = activeTab === "unread"
  return (
    <EmptyState
      icon={isUnreadTab ? <BellOff className="size-10" /> : <Bell className="size-10" />}
      title={isUnreadTab ? "Tidak ada notifikasi belum dibaca" : "Tidak ada notifikasi"}
      description={
        isUnreadTab
          ? "Semua notifikasi sudah Anda baca. Notifikasi baru akan muncul di sini."
          : "Aktivitas terkait akun Anda — seperti suka, komentar, dan permintaan teman — akan tampil di sini."
      }
    />
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="bg-destructive/10 text-destructive mb-4 flex size-16 items-center justify-center rounded-2xl">
        <AlertCircle className="size-8" />
      </div>
      <p className="text-muted-foreground mb-4 max-w-sm text-sm">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="size-4" /> Coba lagi
      </Button>
    </div>
  )
}
