"use client"

import { useState, useMemo } from "react"
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
import { EmptyState } from "@/components/common/empty-state"
import {
  useFriends,
  useFriendRequests,
  useFriendSuggestions,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useSendFriendRequest,
  useUnfriend,
  type Friend,
  type FriendRequest,
  type Suggestion,
} from "@/hooks/api/use-friends"
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

type TabValue = "all" | "requests" | "suggestions"

export function FriendsView() {
  const { openProfile, openConversation, setPendingFriendRequests } = useAppStore()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const [searchInput, setSearchInput] = useState("")
  const [confirmUnfriend, setConfirmUnfriend] = useState<Friend | null>(null)
  const [sentRequestIds, setSentRequestIds] = useState<Set<string>>(new Set())

  // Queries
  const friendsQuery = useFriends()
  const requestsQuery = useFriendRequests()
  const suggestionsQuery = useFriendSuggestions()

  // Mutations
  const acceptMutation = useAcceptFriendRequest()
  const rejectMutation = useRejectFriendRequest()
  const sendRequestMutation = useSendFriendRequest()
  const unfriendMutation = useUnfriend()

  const friends = friendsQuery.data ?? []
  const requests = requestsQuery.data ?? []
  const suggestions = suggestionsQuery.data ?? []

  // Sync pending count to store
  if (requests.length > 0) {
    setPendingFriendRequests(requests.length)
  }

  const filteredFriends = useMemo(() => {
    const q = searchInput.trim().toLowerCase()
    if (!q) return friends
    return friends.filter(
      (f) => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    )
  }, [friends, searchInput])

  const handleAccept = async (requestId: string) => {
    try {
      await acceptMutation.mutateAsync(requestId)
      toast({ title: "Berhasil", description: "Kalian kini berteman" })
    } catch (e: any) {
      toast({ title: "Gagal menerima", description: e.message, variant: "destructive" })
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      await rejectMutation.mutateAsync(requestId)
      toast({ title: "Permintaan ditolak" })
    } catch (e: any) {
      toast({ title: "Gagal menolak", description: e.message, variant: "destructive" })
    }
  }

  const handleSendRequest = async (suggestionId: string) => {
    try {
      const result = await sendRequestMutation.mutateAsync(suggestionId)
      setSentRequestIds((prev) => new Set([...prev, suggestionId]))
      if (result.status === "friends") {
        toast({ title: "Berhasil", description: "Kalian kini berteman" })
      } else {
        toast({ title: "Permintaan terkirim", description: "Menunggu konfirmasi" })
      }
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleConfirmUnfriend = async () => {
    if (!confirmUnfriend) return
    try {
      await unfriendMutation.mutateAsync(confirmUnfriend.id)
      toast({ title: "Berhasil", description: "Pertemanan dihapus" })
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    } finally {
      setConfirmUnfriend(null)
    }
  }

  const totalFriends = friends.length
  const pendingCount = requests.length

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <div className="mb-1 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/30">
            <Users className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Teman</h1>
            <p className="text-muted-foreground text-xs">
              {totalFriends} teman
              {pendingCount > 0 && (
                <>
                  {" · "}
                  <span className="text-primary font-medium">{pendingCount} permintaan</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Tab Bar */}
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
                <Users className="size-4" />
                Semua
                {totalFriends > 0 && (
                  <span className="bg-secondary text-secondary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                    {totalFriends}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative h-10 flex-1 rounded-lg transition-all data-[state=active]:shadow-sm sm:flex-none sm:px-5"
              >
                <Inbox className="size-4" />
                Permintaan
                {pendingCount > 0 && (
                  <span className="bg-primary text-primary-foreground ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="suggestions"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10 flex-1 rounded-lg transition-all data-[state=active]:shadow-sm sm:flex-none sm:px-5"
              >
                <UserPlus className="size-4" />
                Saran
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-0">
              <AllFriendsTab
                friends={filteredFriends}
                totalCount={totalFriends}
                loading={friendsQuery.isLoading}
                error={friendsQuery.error ? "Gagal memuat teman" : null}
                searchInput={searchInput}
                onSearchChange={setSearchInput}
                onRetry={() => friendsQuery.refetch()}
                onMessage={(id) => openConversation("", id)}
                onViewProfile={openProfile}
                onAskUnfriend={setConfirmUnfriend}
              />
            </TabsContent>

            <TabsContent value="requests" className="mt-0">
              <RequestsTab
                requests={requests}
                loading={requestsQuery.isLoading}
                error={requestsQuery.error ? "Gagal memuat permintaan" : null}
                onRetry={() => requestsQuery.refetch()}
                acceptingId={acceptMutation.isPending ? "loading" : null}
                rejectingId={rejectMutation.isPending ? "loading" : null}
                onAccept={handleAccept}
                onReject={handleReject}
                onViewProfile={openProfile}
              />
            </TabsContent>

            <TabsContent value="suggestions" className="mt-0">
              <SuggestionsTab
                suggestions={suggestions}
                loading={suggestionsQuery.isLoading}
                error={suggestionsQuery.error ? "Gagal memuat saran" : null}
                onRetry={() => suggestionsQuery.refetch()}
                requestingId={sendRequestMutation.isPending ? "loading" : null}
                sentRequestIds={sentRequestIds}
                onSendRequest={handleSendRequest}
                onViewProfile={openProfile}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirm Unfriend Dialog */}
      <Dialog open={!!confirmUnfriend} onOpenChange={(o) => !o && setConfirmUnfriend(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Teman?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <span className="text-foreground font-semibold">{confirmUnfriend?.name}</span> dari
              daftar teman? Anda dapat mengirim permintaan teman lagi nanti.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmUnfriend(null)}
              disabled={unfriendMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmUnfriend}
              disabled={unfriendMutation.isPending}
            >
              {unfriendMutation.isPending ? (
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
// ===== Sub-components (purely presentational) =====
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
    <div className="px-2 py-4 sm:px-4">
      {totalCount > 0 && (
        <div className="relative mb-4">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Cari teman..."
            className="bg-muted/60 focus-visible:bg-background border-transparent pr-9 pl-9"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              onClick={() => onSearchChange("")}
              className="hover:bg-accent text-muted-foreground absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full"
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
    <Card className="border-border/60 flex items-start gap-3 p-3 transition-shadow hover:shadow-md sm:gap-4 sm:p-4">
      <button onClick={() => onViewProfile(friend.id)} className="shrink-0 rounded-full">
        <UserAvatar
          src={friend.avatarUrl}
          name={friend.name}
          seed={friend.id}
          size="lg"
          className="ring-border ring-1"
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              onClick={() => onViewProfile(friend.id)}
              className="block max-w-full truncate text-left text-sm font-semibold hover:underline sm:text-base"
            >
              {friend.name}
              {friend.isVerified && (
                <CheckCircle2 className="text-primary ml-1 inline-block size-3.5 align-text-bottom" />
              )}
            </button>
            <div className="text-muted-foreground truncate text-xs">@{friend.username}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-1 size-8 shrink-0"
                aria-label="Opsi lainnya"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => onViewProfile(friend.id)}>
                <Users className="size-4" /> Lihat Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMessage(friend.id)}>
                <MessageCircle className="size-4" /> Kirim Pesan
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onAskUnfriend(friend)}>
                <UserX className="size-4" /> Hapus Teman
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {friend.bio && <p className="text-muted-foreground clamp-2 mt-1 text-sm">{friend.bio}</p>}
        <div className="mt-2 flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8" onClick={() => onMessage(friend.id)}>
            <MessageCircle className="size-3.5" /> Pesan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-8"
            onClick={() => onViewProfile(friend.id)}
          >
            <Users className="size-3.5" /> Profil
          </Button>
        </div>
      </div>
    </Card>
  )
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
}: {
  requests: FriendRequest[]
  loading: boolean
  error: string | null
  onRetry: () => void
  acceptingId: string | null
  rejectingId: string | null
  onAccept: (requestId: string) => void
  onReject: (requestId: string) => void
  onViewProfile: (id: string) => void
}) {
  return (
    <div className="px-2 py-4 sm:px-4">
      <h2 className="text-muted-foreground mb-3 px-1 text-sm font-semibold">Permintaan Masuk</h2>
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
    <Card className="border-border/60 flex items-start gap-3 p-3 transition-shadow hover:shadow-md sm:gap-4 sm:p-4">
      <button onClick={onViewProfile} className="shrink-0 rounded-full">
        <UserAvatar
          src={request.sender.avatarUrl}
          name={request.sender.name}
          seed={request.sender.id}
          size="lg"
          className="ring-border ring-1"
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onViewProfile}
            className="truncate text-left text-sm font-semibold hover:underline sm:text-base"
          >
            {request.sender.name}
            {request.sender.isVerified && (
              <CheckCircle2 className="text-primary ml-1 inline-block size-3.5 align-text-bottom" />
            )}
          </button>
        </div>
        <div className="text-muted-foreground truncate text-xs">@{request.sender.username}</div>
        {request.sender.bio && (
          <p className="text-muted-foreground clamp-2 mt-1 text-sm">{request.sender.bio}</p>
        )}
        <div className="text-muted-foreground/80 mt-1 text-[11px]">
          {formatRelativeTime(request.createdAt)}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
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
            {rejecting ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
            Tolak
          </Button>
        </div>
      </div>
    </Card>
  )
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
}: {
  suggestions: Suggestion[]
  loading: boolean
  error: string | null
  onRetry: () => void
  requestingId: string | null
  sentRequestIds: Set<string>
  onSendRequest: (id: string) => void
  onViewProfile: (id: string) => void
}) {
  return (
    <div className="px-2 py-4 sm:px-4">
      <h2 className="text-muted-foreground mb-3 px-1 text-sm font-semibold">
        Orang yang mungkin Anda kenal
      </h2>
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
    <Card className="border-border/60 flex flex-col items-center p-4 text-center transition-shadow hover:shadow-md">
      <button onClick={onViewProfile} className="mb-3 shrink-0">
        <UserAvatar
          src={suggestion.avatarUrl}
          name={suggestion.name}
          seed={suggestion.id}
          size="xl"
          className="ring-border ring-1"
        />
      </button>
      <button
        onClick={onViewProfile}
        className="max-w-full truncate text-sm font-semibold hover:underline"
      >
        {suggestion.name}
      </button>
      <div className="text-muted-foreground truncate text-xs">@{suggestion.username}</div>
      {suggestion.bio && (
        <p className="text-muted-foreground clamp-2 mt-1.5 text-xs">{suggestion.bio}</p>
      )}
      {suggestion.mutualFriends > 0 && (
        <div className="text-muted-foreground mt-2 flex items-center gap-1 text-[11px]">
          <Users className="size-3" />
          {suggestion.mutualFriends} teman bersama
        </div>
      )}
      <Button
        size="sm"
        className="mt-3 h-8 w-full"
        onClick={onSendRequest}
        disabled={sent || loading}
        variant={sent ? "secondary" : "default"}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : sent ? (
          <>
            <Clock className="size-3.5" /> Terkirim
          </>
        ) : (
          <>
            <UserPlus className="size-3.5" /> Tambah Teman
          </>
        )}
      </Button>
    </Card>
  )
}

function FriendRowSkeleton() {
  return (
    <Card className="border-border/60 flex items-start gap-3 p-3 sm:gap-4 sm:p-4">
      <Skeleton className="size-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-2 h-3 w-full" />
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
    <Card className="border-border/60 flex flex-col items-center p-4 text-center">
      <Skeleton className="mb-3 size-16 rounded-full" />
      <Skeleton className="mb-2 h-4 w-28" />
      <Skeleton className="mb-2 h-3 w-20" />
      <Skeleton className="mb-3 h-3 w-full" />
      <Skeleton className="h-8 w-full" />
    </Card>
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
