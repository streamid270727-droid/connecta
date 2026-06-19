"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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

// ===== Types =====
type NotificationType =
  | "friend_request"
  | "friend_accept"
  | "like"
  | "comment"
  | "reply"
  | "share"
  | "message"

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
  type: NotificationType
  entityId: string | null
  content: string | null
  isRead: boolean
  createdAt: string
  actor: NotificationActor | null
}

type TabValue = "all" | "unread"
type DateGroupKey = "today" | "yesterday" | "older"

// ===== Date helpers =====
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

// ===== Type → icon config =====
interface TypeConfig {
  Icon: LucideIcon
  bg: string // tailwind classes for the icon badge background
  fg: string // tailwind classes for the icon color
  label: string // aria-label / tooltip
}

const TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  like: { Icon: Heart, bg: "bg-rose-500", fg: "text-white", label: "Suka" },
  comment: {
    Icon: MessageCircle,
    bg: "bg-emerald-500",
    fg: "text-white",
    label: "Komentar",
  },
  reply: {
    Icon: CornerDownRight,
    bg: "bg-amber-500",
    fg: "text-white",
    label: "Balasan",
  },
  share: {
    Icon: Share2,
    bg: "bg-violet-500",
    fg: "text-white",
    label: "Bagikan",
  },
  friend_request: {
    Icon: UserPlus,
    bg: "bg-sky-500",
    fg: "text-white",
    label: "Permintaan teman",
  },
  friend_accept: {
    Icon: UserCheck,
    bg: "bg-emerald-500",
    fg: "text-white",
    label: "Teman diterima",
  },
  message: {
    Icon: Mail,
    bg: "bg-primary",
    fg: "text-primary-foreground",
    label: "Pesan",
  },
}

// ===== Main component =====
export function NotificationsView() {
  const { data: session } = useSession()
  const { openProfile, openConversation, setView, setUnreadNotifications } =
    useAppStore()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  )

  // ===== Fetcher =====
  const fetchNotifications = useCallback(async (cursorParam?: string) => {
    if (cursorParam) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)
    try {
      const url = cursorParam
        ? `/api/notifications?cursor=${cursorParam}`
        : "/api/notifications"
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memuat notifikasi")
      }
      const data = await res.json()
      const list: AppNotification[] = data.notifications || []
      if (cursorParam) {
        setNotifications((prev) => [...prev, ...list])
      } else {
        setNotifications(list)
        setUnreadNotifications(list.filter((n) => !n.isRead).length)
      }
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [setUnreadNotifications])

  useEffect(() => {
    void fetchNotifications()
  }, [fetchNotifications])

  // Real-time: listen for new notifications via socket
  const notificationsRef = useRef(notifications)
  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])
  useEffect(() => {
    const socket = getSocket()
    const handleNewNotif = (data: any) => {
      if (!data || data.recipientId !== session?.user?.id) return
      // Add the new notification to the top of the list
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
      setNotifications((prev) => {
        // Dedupe by id
        if (prev.some((n) => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
      setUnreadNotifications(
        notificationsRef.current.filter((n) => !n.isRead).length + 1
      )
    }
    socket.on("notif:new", handleNewNotif)
    return () => {
      socket.off("notif:new", handleNewNotif)
    }
  }, [session?.user?.id, setUnreadNotifications])

  // ===== Navigate per type =====
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
          // like, comment, reply, share — for MVP, just mark as read.
          break
      }
    },
    [openConversation, openProfile, setView]
  )

  // ===== Mark a single notification as read (best-effort background) =====
  const markAsRead = useCallback(
    async (n: AppNotification) => {
      const prevUnread = notifications.filter((x) => !x.isRead).length
      // Optimistic update
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
      )
      setUnreadNotifications(Math.max(0, prevUnread - 1))
      try {
        const res = await fetch(`/api/notifications/${n.id}/read`, {
          method: "POST",
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Gagal menandai dibaca")
        }
      } catch (e) {
        // Revert on failure
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, isRead: false } : x))
        )
        setUnreadNotifications(prevUnread)
        toast({
          title: "Gagal",
          description:
            e instanceof Error ? e.message : "Tidak dapat menandai notifikasi",
          variant: "destructive",
        })
      }
    },
    [notifications, setUnreadNotifications, toast]
  )

  const handleNotificationClick = (n: AppNotification) => {
    // Navigate first for snappy UX
    navigateForType(n)
    // Mark as read in background (skip if already read or another mark in-flight)
    if (!n.isRead && markingId !== n.id) {
      setMarkingId(n.id)
      void markAsRead(n).finally(() => {
        setMarkingId((cur) => (cur === n.id ? null : cur))
      })
    }
  }

  // ===== Mark all as read =====
  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return
    setMarkingAll(true)
    try {
      const res = await fetch("/api/notifications/read-all", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal menandai dibaca")
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadNotifications(0)
      toast({
        title: "Berhasil",
        description: "Semua notifikasi ditandai dibaca",
      })
    } catch (e) {
      toast({
        title: "Gagal",
        description:
          e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setMarkingAll(false)
    }
  }

  // ===== Group notifications by date =====
  const grouped = useMemo(() => {
    const filtered =
      activeTab === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications
    const groups: Record<DateGroupKey, AppNotification[]> = {
      today: [],
      yesterday: [],
      older: [],
    }
    for (const n of filtered) {
      const key = dateGroupKey(new Date(n.createdAt))
      groups[key].push(n)
    }
    return groups
  }, [notifications, activeTab])

  const visibleGroups = DATE_GROUP_ORDER.filter((k) => grouped[k].length > 0)
  const visibleCount =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead).length
      : notifications.length

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Header ===== */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/30">
            <Bell className="size-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">Notifikasi</h1>
            <p className="text-xs text-muted-foreground">
              {notifications.length} notifikasi
              {unreadCount > 0 && (
                <>
                  {" · "}
                  <span className="text-primary font-medium">
                    {unreadCount} belum dibaca
                  </span>
                </>
              )}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="shrink-0 h-8"
            >
              {markingAll ? (
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

      {/* ===== Sticky Tab Bar ===== */}
      <div className="sticky top-14 sm:top-16 z-30 bg-background/80 glass border-b">
        <div className="px-2 sm:px-4">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className="w-full"
          >
            <TabsList className="bg-transparent h-12 w-full justify-start gap-1 p-0 rounded-none">
              <TabsTrigger
                value="all"
                className="flex-1 sm:flex-none sm:px-5 h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                <Bell className="size-4" />
                Semua
                {notifications.length > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="unread"
                className="flex-1 sm:flex-none sm:px-5 h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                <BellOff className="size-4" />
                Belum Dibaca
                {unreadCount > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="px-2 sm:px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <NotificationRowSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchNotifications} />
        ) : visibleCount === 0 ? (
          <EmptyState activeTab={activeTab} />
        ) : (
          <div className="space-y-6">
            {visibleGroups.map((groupKey) => (
              <section key={groupKey}>
                <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {DATE_GROUP_LABEL[groupKey]}
                </h2>
                <div className="space-y-2">
                  {grouped[groupKey].map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onClick={() => handleNotificationClick(n)}
                      onViewActor={() => n.actor && openProfile(n.actor.id)}
                      busy={markingId === n.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && activeTab === "all" && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => cursor && void fetchNotifications(cursor)}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="size-3.5 animate-spin mr-2" />
              ) : null}
              Muat lebih banyak
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// ===== Sub-component: NotificationCard =====
// =====================================================
interface NotificationCardProps {
  notification: AppNotification
  onClick: () => void
  onViewActor: () => void
  busy: boolean
}

function NotificationCard({
  notification,
  onClick,
  onViewActor,
  busy,
}: NotificationCardProps) {
  const cfg =
    TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.like
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
        "p-3 sm:p-4 flex items-start gap-3 sm:gap-4 cursor-pointer transition-all border-border/60 hover:shadow-md hover:border-primary/30 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
        isUnread && "bg-primary/5 border-primary/20"
      )}
    >
      {/* Avatar with type-icon badge overlay */}
      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewActor()
          }}
          className="rounded-full block"
          aria-label={
            actor ? `Lihat profil ${actor.name}` : "Lihat profil"
          }
        >
          {actor ? (
            <UserAvatar
              src={actor.avatarUrl}
              name={actor.name}
              seed={actor.id}
              size="lg"
              className="ring-1 ring-border"
            />
          ) : (
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground ring-1 ring-border">
              <UserPlus className="size-5" />
            </div>
          )}
        </button>
        <div
          className={cn(
            "absolute -bottom-1 -right-1 size-5 rounded-full flex items-center justify-center ring-2 ring-background",
            cfg.bg,
            cfg.fg
          )}
          aria-label={cfg.label}
          title={cfg.label}
        >
          <cfg.Icon className="size-3" />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
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
                  <CheckCircle2 className="inline-block size-3.5 ml-1 text-primary align-text-bottom" />
                )}
              </button>
              {notification.content && (
                <>
                  {" "}
                  <span className="text-foreground/90">
                    {notification.content}
                  </span>
                </>
              )}
            </p>
            <div className="text-[11px] text-muted-foreground mt-1">
              {formatRelativeTime(notification.createdAt)}
            </div>
          </div>

          {/* Unread indicator + busy spinner */}
          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            {busy && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            {isUnread && (
              <span
                aria-label="Belum dibaca"
                className="size-2.5 rounded-full bg-primary shadow-sm shadow-primary/40"
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

// =====================================================
// ===== Skeletons / Empty / Error =====
// =====================================================
function NotificationRowSkeleton() {
  return (
    <Card className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 border-border/60">
      <div className="relative shrink-0">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="absolute -bottom-1 -right-1 size-5 rounded-full ring-2 ring-background" />
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </Card>
  )
}

function EmptyState({ activeTab }: { activeTab: TabValue }) {
  const isUnreadTab = activeTab === "unread"
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="size-20 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 flex items-center justify-center text-rose-500/60 mb-4">
        {isUnreadTab ? (
          <BellOff className="size-10" />
        ) : (
          <Bell className="size-10" />
        )}
      </div>
      <h3 className="font-semibold text-base mb-1">
        {isUnreadTab
          ? "Tidak ada notifikasi belum dibaca"
          : "Tidak ada notifikasi"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {isUnreadTab
          ? "Semua notifikasi sudah Anda baca. Notifikasi baru akan muncul di sini."
          : "Aktivitas terkait akun Anda — seperti suka, komentar, dan permintaan teman — akan tampil di sini."}
      </p>
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
        <AlertCircle className="size-8" />
      </div>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Coba lagi
      </Button>
    </div>
  )
}
