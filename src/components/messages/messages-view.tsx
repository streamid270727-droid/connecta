"use client"

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react"
import { useSession } from "next-auth/react"
import { UserAvatar } from "@/components/common/user-avatar"
import { EmojiPicker } from "@/components/common/emoji-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { getSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import { formatRelativeTime, formatTime, formatShortDate } from "@/lib/format"
import {
  ArrowLeft,
  CheckCheck,
  Check,
  Loader2,
  MoreVertical,
  PenSquare,
  RefreshCw,
  Search as SearchIcon,
  Send,
  Smile,
  User as UserIcon,
  X,
  MessageCircle,
  AlertCircle,
  Users,
  Info,
} from "lucide-react"

// ===== Types =====
interface ChatUser {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified: boolean
}

interface Conversation {
  id: string
  otherUser: ChatUser
  lastMessage: {
    id: string
    content: string
    createdAt: string
    senderId: string
    isRead: boolean
  } | null
  unreadCount: number
  updatedAt: string
}

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  recipientId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: ChatUser
}

interface IncomingSocketMessage {
  id: string
  conversationId: string
  senderId: string
  senderName?: string
  content: string
  createdAt: string
}

interface TypingPayload {
  conversationId: string
  userId?: string
  isTyping?: boolean
}

interface ReadPayload {
  conversationId: string
  readBy: string
}

interface OnlineAck {
  userId: string
  isOnline: boolean
}

interface FriendForCompose {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified: boolean
}

// ===== Helpers =====
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

function dateLabel(d: Date): string {
  const now = new Date()
  if (isSameDay(d, now)) return "Hari ini"
  if (isYesterday(d, now)) return "Kemarin"
  // Same year -> omit year
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
    })
  }
  return formatShortDate(d)
}

function previewText(conv: Conversation, currentUserId: string): string {
  if (!conv.lastMessage) return "Mulai percakapan"
  const prefix =
    conv.lastMessage.senderId === currentUserId ? "Anda: " : ""
  return prefix + conv.lastMessage.content
}

// ===== Sub-component: Typing indicator (three bouncing dots) =====
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm bg-muted border border-border/60 shadow-sm w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-muted-foreground/70 animate-typing-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  )
}

// ===== Sub-component: Conversation list item =====
interface ConversationRowProps {
  conversation: Conversation
  currentUserId: string
  isActive: boolean
  onSelect: () => void
}

function ConversationRow({
  conversation,
  currentUserId,
  isActive,
  onSelect,
}: ConversationRowProps) {
  const other = conversation.otherUser
  const last = conversation.lastMessage
  const unread = conversation.unreadCount
  const time = last ? new Date(last.createdAt) : new Date(conversation.updatedAt)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left flex items-start gap-3 px-3 py-3 transition-colors border-b border-border/40",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:bg-accent/60",
        isActive && "bg-primary/10 hover:bg-primary/15"
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar
          src={other.avatarUrl}
          name={other.name}
          seed={other.id}
          size="md"
        />
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-semibold text-sm truncate">{other.name}</span>
            {other.isVerified && (
              <svg
                className="size-3.5 text-primary shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-label="Terverifikasi"
              >
                <path d="M12 2l2.4 1.8 3 .15 .9 2.85 2.4 1.8-.9 2.85.9 2.85-2.4 1.8-.9 2.85-3 .15L12 22l-2.4-1.8-3-.15-.9-2.85-2.4-1.8.9-2.85L2.4 6.6l2.4-1.8.9-2.85 3-.15L12 2zm-1.2 13.4l5.3-5.3-1.4-1.4-3.9 3.9-1.9-1.9-1.4 1.4 3.3 3.3z" />
              </svg>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {formatRelativeTime(time)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-xs truncate flex-1",
              unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {previewText(conversation, currentUserId)}
          </p>
          {unread > 0 && (
            <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ===== Sub-component: Conversation list skeleton =====
function ConversationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/40">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ===== Sub-component: Empty chat placeholder (desktop) =====
function EmptyChatPlaceholder() {
  return (
    <div className="flex-1 hidden lg:flex items-center justify-center p-8 bg-gradient-to-br from-background to-muted/30">
      <div className="text-center max-w-sm">
        <div className="mx-auto size-20 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-xl shadow-rose-500/30 mb-5">
          <MessageCircle className="size-10 text-white" />
        </div>
        <h3 className="text-xl font-bold mb-2">Pesan Anda</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Pilih percakapan untuk mulai mengobrol, atau buat pesan baru ke teman Anda.
        </p>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5" />
          <span>Pesan bersifat privat dan real-time.</span>
        </div>
      </div>
    </div>
  )
}

// ===== Sub-component: Compose new chat dialog =====
interface NewChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPickUser: (userId: string) => void
}

function NewChatDialog({ open, onOpenChange, onPickUser }: NewChatDialogProps) {
  const { toast } = useToast()
  const [friends, setFriends] = useState<FriendForCompose[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")

  const fetchFriends = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/friends")
      if (!res.ok) throw new Error("Gagal memuat teman")
      const data = await res.json()
      setFriends(data.friends || [])
    } catch {
      setFriends([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery("")
      void fetchFriends()
    }
  }, [open, fetchFriends])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    )
  }, [friends, query])

  const handlePick = (user: FriendForCompose) => {
    onPickUser(user.id)
    toast({
      title: "Memulai percakapan",
      description: `Mengobrol dengan ${user.name}`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pesan Baru</DialogTitle>
          <DialogDescription>
            Pilih teman untuk memulai percakapan.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Cari teman..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="space-y-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Users className="size-8 mx-auto mb-2 opacity-40" />
              {query ? "Tidak ada teman yang cocok." : "Belum ada teman."}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handlePick(f)}
                  className="w-full text-left flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <UserAvatar
                    src={f.avatarUrl}
                    name={f.name}
                    seed={f.id}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate">
                        {f.name}
                      </span>
                      {f.isVerified && (
                        <svg
                          className="size-3.5 text-primary shrink-0"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M12 2l2.4 1.8 3 .15 .9 2.85 2.4 1.8-.9 2.85.9 2.85-2.4 1.8-.9 2.85-3 .15L12 22l-2.4-1.8-3-.15-.9-2.85-2.4-1.8.9-2.85L2.4 6.6l2.4-1.8.9-2.85 3-.15L12 2zm-1.2 13.4l5.3-5.3-1.4-1.4-3.9 3.9-1.9-1.9-1.4 1.4 3.3 3.3z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      @{f.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ===== Sub-component: Single message bubble =====
interface MessageBubbleProps {
  message: ChatMessage
  isFromCurrentUser: boolean
  showAvatar: boolean
  showSenderName: boolean
}

function MessageBubble({
  message,
  isFromCurrentUser,
  showAvatar,
  showSenderName,
}: MessageBubbleProps) {
  const sender = message.sender
  return (
    <div
      className={cn(
        "flex items-end gap-2 animate-fade-in-up",
        isFromCurrentUser ? "justify-end" : "justify-start"
      )}
    >
      {!isFromCurrentUser && (
        <div className="shrink-0 w-8">
          {showAvatar && (
            <UserAvatar
              src={sender.avatarUrl}
              name={sender.name}
              seed={sender.id}
              size="xs"
            />
          )}
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] sm:max-w-[65%] flex flex-col",
          isFromCurrentUser ? "items-end" : "items-start"
        )}
      >
        {showSenderName && !isFromCurrentUser && (
          <span className="text-[10px] text-muted-foreground px-2 mb-0.5 font-medium">
            {sender.name}
          </span>
        )}
        <div
          className={cn(
            "px-3.5 py-2 text-sm break-words whitespace-pre-wrap shadow-sm",
            isFromCurrentUser
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-sm"
              : "bg-muted text-foreground border border-border/60 rounded-2xl rounded-bl-sm"
          )}
        >
          {message.content}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 mt-0.5 px-1 text-[10px] text-muted-foreground",
            isFromCurrentUser && "flex-row-reverse"
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isFromCurrentUser &&
            (message.isRead ? (
              <CheckCheck className="size-3 text-primary" aria-label="Dibaca" />
            ) : (
              <Check className="size-3" aria-label="Terkirim" />
            ))}
        </div>
      </div>
    </div>
  )
}

// ===== Sub-component: Date separator =====
function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center my-3">
      <span className="px-3 py-1 rounded-full bg-muted text-[11px] text-muted-foreground font-medium border border-border/60">
        {label}
      </span>
    </div>
  )
}

// ===== Main component =====
export function MessagesView() {
  const { data: session } = useSession()
  const {
    conversationTarget,
    openConversation,
    openProfile,
    setUnreadMessages,
  } = useAppStore()
  const { toast } = useToast()

  const currentUserId = session?.user?.id ?? ""

  // ===== Conversation list state =====
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [listQuery, setListQuery] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  // ===== Active conversation state =====
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  )
  const [activeOtherUser, setActiveOtherUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [otherIsTyping, setOtherIsTyping] = useState(false)
  const [otherIsOnline, setOtherIsOnline] = useState<boolean | null>(null)

  // ===== Composer state =====
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  // Typing debounce refs
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false)

  // ===== Fetch conversation list =====
  const fetchConversations = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setListLoading(true)
      setListError(null)
      try {
        const res = await fetch("/api/conversations")
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Gagal memuat percakapan")
        }
        const data = await res.json()
        const list: Conversation[] = (data.conversations || []).map(
          (c: Conversation) => ({
            id: c.id,
            otherUser: c.otherUser,
            lastMessage: c.lastMessage
              ? {
                  id: c.lastMessage.id,
                  content: c.lastMessage.content,
                  createdAt: c.lastMessage.createdAt,
                  senderId: c.lastMessage.senderId,
                  isRead: c.lastMessage.isRead,
                }
              : null,
            unreadCount: c.unreadCount ?? 0,
            updatedAt: c.updatedAt,
          })
        )
        setConversations(list)
        // Sync global unread count
        const totalUnread = list.reduce((sum, c) => sum + c.unreadCount, 0)
        setUnreadMessages(totalUnread)
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Terjadi kesalahan")
      } finally {
        setListLoading(false)
        setRefreshing(false)
      }
    },
    [setUnreadMessages]
  )

  // Initial load
  useEffect(() => {
    void fetchConversations()
  }, [fetchConversations])

  // ===== Resolve conversation target from store =====
  // Either direct conversationId, or get-or-create from otherUserId
  const resolveAndOpen = useCallback(async () => {
    if (!conversationTarget) return
    const { conversationId, otherUserId } = conversationTarget
    if (!otherUserId) return

    if (conversationId) {
      // Direct open
      // Find the otherUser from existing conversation list if possible
      const existing = conversations.find((c) => c.id === conversationId)
      setActiveConversationId(conversationId)
      setActiveOtherUser(existing?.otherUser ?? null)
      return
    }

    // Need to get-or-create
    setMessagesLoading(true)
    setMessagesError(null)
    try {
      const res = await fetch(`/api/conversations/${otherUserId}`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memulai percakapan")
      }
      const data = await res.json()
      setActiveConversationId(data.conversationId as string)
      setActiveOtherUser(data.otherUser as ChatUser)
      // Refresh conversation list to include the new one
      void fetchConversations(true)
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : "Terjadi kesalahan")
      setMessagesLoading(false)
    }
  }, [conversationTarget, conversations, fetchConversations])

  useEffect(() => {
    if (!conversationTarget) return
    void resolveAndOpen()
  }, [conversationTarget])

  // Fallback: if activeConversationId is set but activeOtherUser is null
  // (e.g., came from a notification before the conversation list loaded),
  // try to fill in activeOtherUser once the list arrives.
  useEffect(() => {
    if (!activeConversationId || activeOtherUser) return
    const existing = conversations.find((c) => c.id === activeConversationId)
    if (existing) {
      setActiveOtherUser(existing.otherUser)
    }
  }, [activeConversationId, activeOtherUser, conversations])

  // ===== Load messages for active conversation =====
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return
    setMessagesLoading(true)
    setMessagesError(null)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memuat pesan")
      }
      const data = await res.json()
      setMessages((data.messages || []) as ChatMessage[])
      // Server marked them as read; refresh conversation list to update unread badges
    } catch (e) {
      setMessagesError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  // ===== Socket setup for active conversation =====
  useEffect(() => {
    if (!activeConversationId) return

    // Load messages
    void loadMessages(activeConversationId)
    // Refresh list to update unread badges (after server marks read)
    void fetchConversations(true)

    const socket = getSocket()
    socket.emit("conv:join", { conversationId: activeConversationId })

    // Online status check (ack-based)
    if (activeOtherUser) {
      try {
        socket.emit(
          "user:check-online",
          { userId: activeOtherUser.id },
          (ack: OnlineAck) => {
            if (ack && typeof ack.isOnline === "boolean") {
              setOtherIsOnline(ack.isOnline)
            }
          }
        )
      } catch {
        // ignore ack errors
      }
    }

    // Incoming DM (only handle messages for the active conversation)
    const onMessage = (msg: IncomingSocketMessage) => {
      if (!msg || msg.conversationId !== activeConversationId) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        const newMessage: ChatMessage = {
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          recipientId: currentUserId,
          content: msg.content,
          isRead: true, // we have it open, so considered read
          createdAt: msg.createdAt,
          sender: activeOtherUser ?? {
            id: msg.senderId,
            name: msg.senderName ?? "Pengguna",
            username: "",
            avatarUrl: null,
            isVerified: false,
          },
        }
        return [...prev, newMessage]
      })
      // Hide typing indicator on actual message arrival
      setOtherIsTyping(false)
      // Mark as read server-side (best-effort)
      void fetch(`/api/conversations/${activeConversationId}/messages`).catch(
        () => {}
      )
      // Refresh conversation list + global unread
      void fetchConversations(true)
    }

    const onTyping = (data: TypingPayload) => {
      if (!data || data.conversationId !== activeConversationId) return
      // Only show if the typing user is the other participant
      if (activeOtherUser && data.userId !== activeOtherUser.id) return
      if (data.isTyping === false) {
        setOtherIsTyping(false)
      } else {
        setOtherIsTyping(true)
      }
    }

    const onStopTyping = (data: TypingPayload) => {
      if (!data || data.conversationId !== activeConversationId) return
      setOtherIsTyping(false)
    }

    const onRead = (data: ReadPayload) => {
      if (!data || data.conversationId !== activeConversationId) return
      // The other user read our messages -> mark all our sent messages as read
      setMessages((prev) =>
        prev.map((m) =>
          m.senderId === currentUserId ? { ...m, isRead: true } : m
        )
      )
    }

    socket.on("dm:message", onMessage)
    socket.on("dm:typing", onTyping)
    socket.on("dm:stop-typing", onStopTyping)
    socket.on("dm:read", onRead)

    return () => {
      socket.emit("conv:leave", { conversationId: activeConversationId })
      socket.off("dm:message", onMessage)
      socket.off("dm:typing", onTyping)
      socket.off("dm:stop-typing", onStopTyping)
      socket.off("dm:read", onRead)
      // Reset typing/online indicators
      setOtherIsTyping(false)
      setOtherIsOnline(null)
      // Send stop-typing if we were typing
      if (isTypingRef.current && activeOtherUser) {
        socket.emit("dm:stop-typing", {
          conversationId: activeConversationId,
          recipientId: activeOtherUser.id,
        })
        isTypingRef.current = false
      }
    }
  }, [
    activeConversationId,
    activeOtherUser,
    currentUserId,
    loadMessages,
    fetchConversations,
  ])

  // ===== Auto-scroll to bottom when messages or typing change =====
  useEffect(() => {
    const el = messagesEndRef.current
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [messages, otherIsTyping])

  // ===== Filter conversation list (local search) =====
  const filteredConversations = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.otherUser.name.toLowerCase().includes(q) ||
        c.otherUser.username.toLowerCase().includes(q)
    )
  }, [conversations, listQuery])

  // ===== Open a conversation by id =====
  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      setActiveConversationId(conv.id)
      setActiveOtherUser(conv.otherUser)
      // Update store so a back-and-forth (e.g., navigation) preserves context
      openConversation(conv.id, conv.otherUser.id)
      setMessages([])
      setMessagesError(null)
      setOtherIsTyping(false)
      setDraft("")
      if (textareaRef.current) textareaRef.current.style.height = "auto"
    },
    [openConversation]
  )

  // ===== Back to list (mobile) =====
  const handleBackToList = useCallback(() => {
    setActiveConversationId(null)
    setActiveOtherUser(null)
    setMessages([])
    setMessagesError(null)
    setOtherIsTyping(false)
    setDraft("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }, [])

  // ===== Send a message =====
  const handleSend = useCallback(async () => {
    if (!activeConversationId || !activeOtherUser) return
    const content = draft.trim()
    if (!content || sending) return

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`
    const optimisticMessage: ChatMessage = {
      id: tempId,
      conversationId: activeConversationId,
      senderId: currentUserId,
      recipientId: activeOtherUser.id,
      content,
      isRead: false,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: session?.user?.name ?? "Anda",
        username: session?.user?.username ?? "",
        avatarUrl: session?.user?.image ?? null,
        isVerified: false,
      },
    }

    setMessages((prev) => [...prev, optimisticMessage])
    setDraft("")
    setSending(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    // Stop typing indicator
    if (isTypingRef.current) {
      const socket = getSocket()
      socket.emit("dm:stop-typing", {
        conversationId: activeConversationId,
        recipientId: activeOtherUser.id,
      })
      isTypingRef.current = false
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim pesan")
      }
      const real = data.message as ChatMessage
      // Replace the optimistic temp message with the real one.
      // If a real-time socket event already inserted the real message
      // (race), we drop the temp duplicate instead of duplicating.
      setMessages((prev) => {
        if (prev.some((m) => m.id === real.id)) {
          return prev.filter((m) => m.id !== tempId)
        }
        return prev.map((m) => (m.id === tempId ? real : m))
      })
      // Optimistically update the conversation list's lastMessage + bump it to the top
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                lastMessage: {
                  id: real.id,
                  content: real.content,
                  createdAt: real.createdAt,
                  senderId: real.senderId,
                  isRead: real.isRead,
                },
                updatedAt: real.createdAt,
              }
            : c
        )
        // Re-sort by lastMessage.createdAt desc
        return updated.sort((a, b) => {
          const aT = a.lastMessage?.createdAt ?? a.updatedAt
          const bT = b.lastMessage?.createdAt ?? b.updatedAt
          return new Date(bT).getTime() - new Date(aT).getTime()
        })
      })
    } catch (e) {
      // Remove the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      toast({
        title: "Gagal mengirim",
        description: e instanceof Error ? e.message : "Coba lagi nanti",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }, [
    activeConversationId,
    activeOtherUser,
    draft,
    sending,
    currentUserId,
    session?.user?.name,
    session?.user?.username,
    session?.user?.image,
    toast,
  ])

  // ===== Typing indicator emit (debounced) =====
  const emitTyping = useCallback(() => {
    if (!activeConversationId || !activeOtherUser) return
    const socket = getSocket()

    if (!isTypingRef.current) {
      socket.emit("dm:typing", {
        conversationId: activeConversationId,
        recipientId: activeOtherUser.id,
        isTyping: true,
      })
      isTypingRef.current = true
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("dm:stop-typing", {
        conversationId: activeConversationId,
        recipientId: activeOtherUser.id,
      })
      isTypingRef.current = false
    }, 3000)
  }, [activeConversationId, activeOtherUser])

  // ===== Textarea auto-resize + emit typing =====
  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    const next = Math.min(el.scrollHeight, 140)
    el.style.height = `${next}px`
  }, [])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value)
      adjustTextareaHeight()
      if (e.target.value.trim()) {
        emitTyping()
      }
    },
    [adjustTextareaHeight, emitTyping]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send, Shift+Enter for newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend]
  )

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
    }
  }, [])

  // ===== Compose dialog pick handler =====
  const handleComposePick = useCallback(
    (userId: string) => {
      // openConversation with empty conversationId signals get-or-create flow
      setActiveConversationId(null)
      setActiveOtherUser(null)
      setMessages([])
      setMessagesError(null)
      openConversation("", userId)
    },
    [openConversation]
  )

  // ===== Group messages with date separators =====
  const messageGroups = useMemo(() => {
    const groups: { label: string; items: ChatMessage[] }[] = []
    for (const m of messages) {
      const d = new Date(m.createdAt)
      const label = dateLabel(d)
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.items.push(m)
      } else {
        groups.push({ label, items: [m] })
      }
    }
    return groups
  }, [messages])

  // ===== Derived: show conversation list vs chat on mobile =====
  const showChatOnMobile = !!activeConversationId

  return (
    <div className="h-[calc(100dvh-7.5rem)] sm:h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-4rem)] lg:flex lg:overflow-hidden">
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.6; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .animate-typing-bounce { animation: typing-bounce 1.2s infinite ease-in-out; }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.2s ease-out; }
        .messages-scroll::-webkit-scrollbar { width: 6px; }
        .messages-scroll::-webkit-scrollbar-track { background: transparent; }
        .messages-scroll::-webkit-scrollbar-thumb {
          background: var(--muted-foreground);
          opacity: 0.4;
          border-radius: 9999px;
        }
        .messages-scroll { scrollbar-width: thin; }
      `}</style>

      {/* ===== LEFT PANE: Conversation list ===== */}
      <aside
        className={cn(
          "lg:w-80 lg:border-r border-border bg-background lg:shrink-0 lg:flex lg:flex-col",
          "w-full h-full",
          showChatOnMobile ? "hidden lg:flex" : "flex flex-col"
        )}
      >
        {/* List header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/30">
                <MessageCircle className="size-5 text-white" />
              </div>
              <h1 className="text-lg font-bold">Pesan</h1>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => void fetchConversations(true)}
                disabled={refreshing}
                aria-label="Segarkan"
              >
                <RefreshCw
                  className={cn("size-4", refreshing && "animate-spin")}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-9"
                onClick={() => setComposeOpen(true)}
                aria-label="Pesan baru"
              >
                <PenSquare className="size-4" />
              </Button>
            </div>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Cari percakapan..."
              className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background h-9"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
            />
            {listQuery && (
              <button
                type="button"
                onClick={() => setListQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto messages-scroll">
          {listLoading ? (
            <ConversationListSkeleton />
          ) : listError ? (
            <div className="p-6 text-center">
              <AlertCircle className="size-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm font-medium mb-1">Gagal memuat</p>
              <p className="text-xs text-muted-foreground mb-3">{listError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchConversations()}
              >
                Coba lagi
              </Button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto size-16 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <MessageCircle className="size-8 text-muted-foreground/60" />
              </div>
              <p className="font-semibold mb-1">
                {listQuery ? "Tidak ada hasil" : "Belum ada percakapan"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {listQuery
                  ? "Coba kata kunci lain."
                  : "Mulai mengobrol dengan teman Anda sekarang."}
              </p>
              {!listQuery && (
                <Button
                  size="sm"
                  onClick={() => setComposeOpen(true)}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90"
                >
                  <PenSquare className="size-4" />
                  Pesan Baru
                </Button>
              )}
            </div>
          ) : (
            <div>
              {filteredConversations.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  currentUserId={currentUserId}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => handleSelectConversation(conv)}
                />
              ))}
              <div className="py-4 text-center text-[10px] text-muted-foreground/60">
                {filteredConversations.length} percakapan
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== RIGHT PANE: Chat window ===== */}
      <section
        className={cn(
          "flex-1 flex flex-col bg-background min-w-0 h-full",
          showChatOnMobile ? "flex" : "hidden lg:flex"
        )}
      >
        {!activeConversationId || !activeOtherUser ? (
          <EmptyChatPlaceholder />
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border/60 bg-background sticky top-0 z-10">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden size-9"
                onClick={handleBackToList}
                aria-label="Kembali"
              >
                <ArrowLeft className="size-5" />
              </Button>
              <button
                type="button"
                onClick={() => openProfile(activeOtherUser.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1 -m-1 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <UserAvatar
                  src={activeOtherUser.avatarUrl}
                  name={activeOtherUser.name}
                  seed={activeOtherUser.id}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-sm truncate">
                      {activeOtherUser.name}
                    </span>
                    {activeOtherUser.isVerified && (
                      <svg
                        className="size-3.5 text-primary shrink-0"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 2l2.4 1.8 3 .15 .9 2.85 2.4 1.8-.9 2.85.9 2.85-2.4 1.8-.9 2.85-3 .15L12 22l-2.4-1.8-3-.15-.9-2.85-2.4-1.8.9-2.85L2.4 6.6l2.4-1.8.9-2.85 3-.15L12 2zm-1.2 13.4l5.3-5.3-1.4-1.4-3.9 3.9-1.9-1.9-1.4 1.4 3.3 3.3z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {otherIsTyping
                      ? "sedang mengetik..."
                      : otherIsOnline === null
                        ? "Sedang online"
                        : otherIsOnline
                          ? "Sedang online"
                          : "Terakhir dilihat baru saja"}
                  </p>
                </div>
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label="Opsi"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    onClick={() => openProfile(activeOtherUser.id)}
                  >
                    <UserIcon className="size-4" />
                    Lihat Profil
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleBackToList}
                  >
                    <X className="size-4" />
                    Tutup Percakapan
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto messages-scroll px-3 sm:px-4 py-4 bg-gradient-to-b from-background to-muted/20"
            >
              {messagesLoading ? (
                <div className="space-y-4">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex",
                        i % 2 === 0 ? "justify-start" : "justify-end"
                      )}
                    >
                      <Skeleton
                        className={cn(
                          "h-12 rounded-2xl",
                          i % 2 === 0
                            ? "w-48 rounded-bl-sm"
                            : "w-40 rounded-br-sm"
                        )}
                      />
                    </div>
                  ))}
                </div>
              ) : messagesError ? (
                <div className="p-6 text-center">
                  <AlertCircle className="size-8 mx-auto mb-2 text-destructive" />
                  <p className="text-sm font-medium mb-1">Gagal memuat pesan</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {messagesError}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      activeConversationId &&
                      void loadMessages(activeConversationId)
                    }
                  >
                    Coba lagi
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6">
                  <div className="size-16 rounded-2xl bg-gradient-to-br from-rose-500/15 to-pink-600/15 flex items-center justify-center mb-3">
                    <MessageCircle className="size-8 text-primary" />
                  </div>
                  <p className="font-semibold mb-1">Belum ada pesan</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Mulai percakapan dengan {activeOtherUser.name} dengan
                    mengirim pesan pertama.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-w-3xl mx-auto">
                  {messageGroups.map((group, gi) => (
                    <div key={`${gi}-${group.label}`}>
                      <DateSeparator label={group.label} />
                      <div className="space-y-2.5">
                        {group.items.map((m, mi) => {
                          const isFromMe = m.senderId === currentUserId
                          const prev = group.items[mi - 1]
                          const showAvatar =
                            !prev || prev.senderId !== m.senderId
                          const showSenderName =
                            !isFromMe &&
                            (!prev || prev.senderId !== m.senderId)
                          return (
                            <MessageBubble
                              key={m.id}
                              message={m}
                              isFromCurrentUser={isFromMe}
                              showAvatar={showAvatar}
                              showSenderName={showSenderName}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {otherIsTyping && (
                    <div className="flex items-end gap-2 pt-1">
                      <div className="shrink-0 w-8">
                        <UserAvatar
                          src={activeOtherUser.avatarUrl}
                          name={activeOtherUser.name}
                          seed={activeOtherUser.id}
                          size="xs"
                        />
                      </div>
                      <TypingDots />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-border/60 bg-background px-3 sm:px-4 py-2.5 safe-bottom">
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                <EmojiPicker
                  onSelect={(emoji) => {
                    setDraft((prev) => prev + emoji)
                    textareaRef.current?.focus()
                  }}
                />
                <Textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Tulis pesan..."
                  rows={1}
                  className="min-h-9 max-h-36 resize-none rounded-2xl bg-muted/60 border-transparent focus-visible:bg-background py-2 px-3.5"
                />
                <Button
                  size="icon"
                  className="size-9 shrink-0 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 hover:opacity-90 disabled:opacity-40"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || sending}
                  aria-label="Kirim"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 text-center mt-1 hidden sm:block">
                Enter untuk mengirim · Shift + Enter untuk baris baru
              </p>
            </div>
          </>
        )}
      </section>

      {/* Compose new chat dialog */}
      <NewChatDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onPickUser={handleComposePick}
      />
    </div>
  )
}
