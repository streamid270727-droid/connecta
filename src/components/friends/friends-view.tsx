"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime } from "@/lib/format"
import {
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  MessageCircle,
  Users,
  RefreshCw,
  AlertCircle,
  Search,
  UserX,
  Inbox,
  X,
  Clock,
} from "lucide-react"

// ===== Types =====
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

type TabValue = "all" | "requests" | "suggestions"

export function FriendsView() {
  const { openProfile, openConversation, setPendingFriendRequests } = useAppStore()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabValue>("all")

  // Data state
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  // Loading state per fetch
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  // Errors
  const [friendsError, setFriendsError] = useState<string | null>(null)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)

  // Local filter for the "Semua" tab
  const [searchInput, setSearchInput] = useState("")

  // Action loading flags (per-item ids)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [unfriendingId, setUnfriendingId] = useState<string | null>(null)

  // Confirm unfriend dialog
  const [confirmUnfriend, setConfirmUnfriend] = useState<Friend | null>(null)

  // Track sent request ids so we can optimistically mark suggestion as "Terkirim"
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set())

  // ===== Fetchers =====
  const fetchFriends = useCallback(async () => {
    setFriendsLoading(true)
    setFriendsError(null)
    try {
      const res = await fetch("/api/friends")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memuat teman")
      }
      const data = await res.json()
      setFriends(data.friends || [])
    } catch (e) {
      setFriendsError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setFriendsLoading(false)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true)
    setRequestsError(null)
    try {
      const res = await fetch("/api/friends/requests")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memuat permintaan")
      }
      const data = await res.json()
      setRequests(data.requests || [])
      setPendingFriendRequests(data.requests?.length || 0)
    } catch (e) {
      setRequestsError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setRequestsLoading(false)
    }
  }, [setPendingFriendRequests])

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      const res = await fetch("/api/friends/suggestions")
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memuat saran")
      }
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (e) {
      setSuggestionsError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    void fetchFriends()
    void fetchRequests()
    void fetchSuggestions()
  }, [fetchFriends, fetchRequests, fetchSuggestions])

  // ===== Filtered friends (local search) =====
  const filteredFriends = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
    )
  }, [friends, searchInput])

  // ===== Actions =====
  const handleAccept = async (requestId: string) => {
    if (acceptingId) return
    setAcceptingId(requestId)
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Gagal menerima",
          description: data.error || "Coba lagi nanti",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Berhasil",
          description: "Kalian kini berteman",
        })
        // Remove from requests and add to friends list
        const accepted = requests.find((r) => r.id === requestId)
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        setPendingFriendRequests(
          requests.filter((r) => r.id !== requestId).length
        )
        if (accepted) {
          setFriends((prev) => [
            {
              id: accepted.sender.id,
              name: accepted.sender.name,
              username: accepted.sender.username,
              avatarUrl: accepted.sender.avatarUrl,
              bio: accepted.sender.bio,
              isVerified: accepted.sender.isVerified,
              friendedAt: new Date().toISOString(),
            },
            ...prev,
          ])
          // Remove from suggestions if present
          setSuggestions((prev) =>
            prev.filter((s) => s.id !== accepted.sender.id)
          )
        }
      }
    } catch {
      toast({
        title: "Terjadi kesalahan",
        variant: "destructive",
      })
    } finally {
      setAcceptingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (rejectingId) return
    setRejectingId(requestId)
    try {
      const res = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Gagal menolak",
          description: data.error || "Coba lagi nanti",
          variant: "destructive",
        })
      } else {
        toast({ title: "Permintaan ditolak" })
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        setPendingFriendRequests(
          requests.filter((r) => r.id !== requestId).length
        )
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setRejectingId(null)
    }
  }

  const handleSendRequest = async (suggestionId: string) => {
    if (requestingId) return
    setRequestingId(suggestionId)
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: suggestionId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Gagal",
          description: data.error || "Coba lagi nanti",
          variant: "destructive",
        })
      } else {
        // Auto-accepted? (bidirectional friendship case)
        if (data.status === "friends") {
          toast({
            title: "Berhasil",
            description: "Kalian kini berteman",
          })
          // Move suggestion to friends
          const sug = suggestions.find((s) => s.id === suggestionId)
          if (sug) {
            setFriends((prev) => [
              {
                id: sug.id,
                name: sug.name,
                username: sug.username,
                avatarUrl: sug.avatarUrl,
                bio: sug.bio,
                isVerified: false,
                friendedAt: new Date().toISOString(),
              },
              ...prev,
            ])
          }
          setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
        } else {
          toast({
            title: "Permintaan terkirim",
            description: "Menunggu konfirmasi",
          })
          setSentRequestIds((prev) => new Set(prev).add(suggestionId))
        }
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setRequestingId(null)
    }
  }

  const handleConfirmUnfriend = async () => {
    if (!confirmUnfriend || unfriendingId) return
    const friend = confirmUnfriend
    setUnfriendingId(friend.id)
    try {
      const res = await fetch(`/api/friends/${friend.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Gagal",
          description: data.error || "Coba lagi nanti",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Berhasil",
          description: "Pertemanan dihapus",
        })
        setFriends((prev) => prev.filter((f) => f.id !== friend.id))
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setUnfriendingId(null)
      setConfirmUnfriend(null)
    }
  }

  // Total count
  const totalFriends = friends.length
  const pendingCount = requests.length

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Header ===== */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/30">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Teman</h1>
            <p className="text-xs text-muted-foreground">
              {totalFriends} teman
              {pendingCount > 0 && (
                <>
                  {" · "}
                  <span className="text-primary font-medium">
                    {pendingCount} permintaan
                  </span>
                </>
              )}
            </p>
          </div>
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
                <Users className="size-4" />
                Semua
                {totalFriends > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center">
                    {totalFriends}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="flex-1 sm:flex-none sm:px-5 h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all relative"
              >
                <Inbox className="size-4" />
                Permintaan
                {pendingCount > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="flex-1 sm:flex-none sm:px-5 h-10 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                <UserPlus className="size-4" />
                Saran
              </TabsTrigger>
            </TabsList>

            {/* ===== Tab: Semua ===== */}
            <TabsContent value="all" className="mt-0">
              <AllFriendsTab
                friends={filteredFriends}
                totalCount={totalFriends}
                loading={friendsLoading}
                error={friendsError}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                onRetry={fetchFriends}
                onMessage={(id) => openConversation("", id)}
                onViewProfile={openProfile}
                onAskUnfriend={setConfirmUnfriend}
              />
            </TabsContent>

            {/* ===== Tab: Permintaan ===== */}
            <TabsContent value="requests" className="mt-0">
              <RequestsTab
                requests={requests}
                loading={requestsLoading}
                error={requestsError}
                onRetry={fetchRequests}
                acceptingId={acceptingId}
                rejectingId={rejectingId}
                onAccept={handleAccept}
                onReject={handleReject}
                onViewProfile={openProfile}
              />
            </TabsContent>

            {/* ===== Tab: Saran ===== */}
            <TabsContent value="suggestions" className="mt-0">
              <SuggestionsTab
                suggestions={suggestions}
                loading={suggestionsLoading}
                error={suggestionsError}
                onRetry={fetchSuggestions}
                requestingId={requestingId}
                sentRequestIds={sentRequestIds}
                onSendRequest={handleSendRequest}
                onViewProfile={openProfile}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ===== Confirm Unfriend Dialog ===== */}
      <Dialog
        open={!!confirmUnfriend}
        onOpenChange={(o) => !o && setConfirmUnfriend(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Teman?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold text-foreground">
                {confirmUnfriend?.name}
              </span>{" "}
              dari daftar teman? Anda dapat mengirim permintaan teman lagi nanti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmUnfriend(null)}
              disabled={!!unfriendingId}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnfriend}
              disabled={!!unfriendingId}
            >
              {unfriendingId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <UserX className="size-4" />
              )}
              Hapus Teman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =====================================================
// ===== Sub-component: AllFriendsTab =====
// =====================================================
interface AllFriendsTabProps {
  friends: Friend[]
  totalCount: number
  loading: boolean
  error: string | null
  searchInput: string
  onSearchChange: (v: string) => void
  onRetry: () => void
  onMessage: (id: string) => void
  onViewProfile: (id: string) => void
  onAskUnfriend: (friend: Friend) => void
}

function AllFriendsTab({
  friends,
  totalCount,
  loading,
  error,
  searchInput,
  onSearchChange,
  onRetry,
  onMessage,
  onViewProfile,
  onAskUnfriend,
}: AllFriendsTabProps) {
  return (
    <div className="px-2 sm:px-4 py-4">
      {/* Search input */}
      {totalCount > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari teman..."
            className="pl-9 pr-9 bg-muted/60 border-transparent focus-visible:bg-background"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
              aria-label="Hapus pencarian"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <FriendRowSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : totalCount === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title="Belum punya teman"
          description="Mulai temukan orang-orang untuk dijadikan teman di tab Saran."
        />
      ) : friends.length === 0 ? (
        <EmptyState
          icon={<Search className="size-12" />}
          title="Tidak ditemukan"
          description={`Tidak ada teman yang cocok dengan "${searchInput}".`}
        />
      ) : (
        <div className="space-y-2">
          {friends.map((friend) => (
            <FriendCard
              key={friend.id}
              friend={friend}
              onMessage={onMessage}
              onViewProfile={onViewProfile}
              onAskUnfriend={onAskUnfriend}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FriendCard({
  friend,
  onMessage,
  onViewProfile,
  onAskUnfriend,
}: {
  friend: Friend
  onMessage: (id: string) => void
  onViewProfile: (id: string) => void
  onAskUnfriend: (friend: Friend) => void
}) {
  return (
    <Card className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:shadow-md transition-shadow border-border/60">
      <button
        onClick={() => onViewProfile(friend.id)}
        className="shrink-0 rounded-full"
        aria-label={`Lihat profil ${friend.name}`}
      >
        <UserAvatar
          src={friend.avatarUrl}
          name={friend.name}
          seed={friend.id}
          size="lg"
          className="ring-1 ring-border"
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              onClick={() => onViewProfile(friend.id)}
              className="font-semibold text-sm sm:text-base hover:underline text-left truncate block max-w-full"
            >
              {friend.name}
              {friend.isVerified && (
                <CheckCircle2 className="inline-block size-3.5 ml-1 text-primary align-text-bottom" />
              )}
            </button>
            <div className="text-xs text-muted-foreground truncate">
              @{friend.username}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 -mr-1 -mt-1 shrink-0"
                aria-label="Opsi"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onViewProfile(friend.id)}>
                <Users className="size-4" />
                Lihat Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMessage(friend.id)}>
                <MessageCircle className="size-4" />
                Kirim Pesan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onAskUnfriend(friend)}
              >
                <UserX className="size-4" />
                Hapus Teman
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {friend.bio && (
          <p className="text-sm text-muted-foreground clamp-2 mt-1">
            {friend.bio}
          </p>
        )}

        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onMessage(friend.id)}
          >
            <MessageCircle className="size-3.5" />
            Pesan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={() => onViewProfile(friend.id)}
          >
            <Users className="size-3.5" />
            Profil
          </Button>
        </div>
      </div>
    </Card>
  )
}

// =====================================================
// ===== Sub-component: RequestsTab =====
// =====================================================
interface RequestsTabProps {
  requests: FriendRequest[]
  loading: boolean
  error: string | null
  onRetry: () => void
  acceptingId: string | null
  rejectingId: string | null
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
  onViewProfile: (id: string) => void
}

function RequestsTab({
  requests,
  loading,
  error,
  onRetry,
  acceptingId,
  rejectingId,
  onAccept,
  onReject,
  onViewProfile,
}: RequestsTabProps) {
  return (
    <div className="px-2 sm:px-4 py-4">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
        Permintaan Masuk
      </h2>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <FriendRowSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-12" />}
          title="Tidak ada permintaan"
          description="Permintaan pertemanan yang masuk akan tampil di sini."
        />
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              accepting={acceptingId === req.id}
              rejecting={rejectingId === req.id}
              onAccept={() => onAccept(req.id)}
              onReject={() => onReject(req.id)}
              onViewProfile={() => onViewProfile(req.sender.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RequestRow({
  request,
  accepting,
  rejecting,
  onAccept,
  onReject,
  onViewProfile,
}: {
  request: FriendRequest
  accepting: boolean
  rejecting: boolean
  onAccept: () => void
  onReject: () => void
  onViewProfile: () => void
}) {
  return (
    <Card className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:shadow-md transition-shadow border-border/60">
      <button
        onClick={onViewProfile}
        className="shrink-0 rounded-full"
        aria-label={`Lihat profil ${request.sender.name}`}
      >
        <UserAvatar
          src={request.sender.avatarUrl}
          name={request.sender.name}
          seed={request.sender.id}
          size="lg"
          className="ring-1 ring-border"
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onViewProfile}
            className="font-semibold text-sm sm:text-base hover:underline truncate text-left"
          >
            {request.sender.name}
            {request.sender.isVerified && (
              <CheckCircle2 className="inline-block size-3.5 ml-1 text-primary align-text-bottom" />
            )}
          </button>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          @{request.sender.username}
        </div>
        {request.sender.bio && (
          <p className="text-sm text-muted-foreground clamp-2 mt-1">
            {request.sender.bio}
          </p>
        )}
        <div className="text-[11px] text-muted-foreground/80 mt-1">
          {formatRelativeTime(request.createdAt)}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <Button
            size="sm"
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UserCheck className="size-3.5" />
            )}
            Terima
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={onReject}
            disabled={accepting || rejecting}
          >
            {rejecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <X className="size-3.5" />
            )}
            Tolak
          </Button>
        </div>
      </div>
    </Card>
  )
}

// =====================================================
// ===== Sub-component: SuggestionsTab =====
// =====================================================
interface SuggestionsTabProps {
  suggestions: Suggestion[]
  loading: boolean
  error: string | null
  onRetry: () => void
  requestingId: string | null
  sentRequestIds: Set<string>
  onSendRequest: (id: string) => void
  onViewProfile: (id: string) => void
}

function SuggestionsTab({
  suggestions,
  loading,
  error,
  onRetry,
  requestingId,
  sentRequestIds,
  onSendRequest,
  onViewProfile,
}: SuggestionsTabProps) {
  return (
    <div className="px-2 sm:px-4 py-4">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
        Orang yang mungkin Anda kenal
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SuggestionCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : suggestions.length === 0 ? (
        <EmptyState
          icon={<UserPlus className="size-12" />}
          title="Tidak ada saran"
          description="Saran teman akan muncul di sini saat tersedia."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((sug) => (
            <SuggestionCard
              key={sug.id}
              suggestion={sug}
              sent={sentRequestIds.has(sug.id)}
              loading={requestingId === sug.id}
              onSendRequest={() => onSendRequest(sug.id)}
              onViewProfile={() => onViewProfile(sug.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({
  suggestion,
  sent,
  loading,
  onSendRequest,
  onViewProfile,
}: {
  suggestion: Suggestion
  sent: boolean
  loading: boolean
  onSendRequest: () => void
  onViewProfile: () => void
}) {
  return (
    <Card className="p-4 flex flex-col items-center text-center hover:shadow-md transition-shadow border-border/60">
      <button
        onClick={onViewProfile}
        className="shrink-0 mb-3"
        aria-label={`Lihat profil ${suggestion.name}`}
      >
        <UserAvatar
          src={suggestion.avatarUrl}
          name={suggestion.name}
          seed={suggestion.id}
          size="xl"
          className="ring-1 ring-border"
        />
      </button>

      <button
        onClick={onViewProfile}
        className="font-semibold text-sm hover:underline truncate max-w-full"
      >
        {suggestion.name}
      </button>
      <div className="text-xs text-muted-foreground truncate">
        @{suggestion.username}
      </div>

      {suggestion.bio && (
        <p className="text-xs text-muted-foreground clamp-2 mt-1.5">
          {suggestion.bio}
        </p>
      )}

      {suggestion.mutualFriends > 0 && (
        <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
          <Users className="size-3" />
          {suggestion.mutualFriends} teman bersama
        </div>
      )}

      <Button
        size="sm"
        className="h-8 w-full mt-3"
        onClick={onSendRequest}
        disabled={sent || loading}
        variant={sent ? "secondary" : "default"}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : sent ? (
          <>
            <Clock className="size-3.5" />
            Terkirim
          </>
        ) : (
          <>
            <UserPlus className="size-3.5" />
            Tambah Teman
          </>
        )}
      </Button>
    </Card>
  )
}

// =====================================================
// ===== Shared sub-components =====
// =====================================================
function FriendRowSkeleton() {
  return (
    <Card className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 border-border/60">
      <Skeleton className="size-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-full mt-2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </Card>
  )
}

function SuggestionCardSkeleton() {
  return (
    <Card className="p-4 flex flex-col items-center text-center border-border/60">
      <Skeleton className="size-16 rounded-full mb-3" />
      <Skeleton className="h-4 w-28 mb-2" />
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-3 w-full mb-3" />
      <Skeleton className="h-8 w-full" />
    </Card>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="size-20 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 flex items-center justify-center text-muted-foreground/60 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-base mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
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
