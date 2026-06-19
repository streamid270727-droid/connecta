"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatRelativeTime, formatNumber } from "@/lib/format"
import {
  Search as SearchIcon,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  Users,
  FileText,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Clock,
  TrendingUp,
  CheckCircle2,
} from "lucide-react"

type FilterTab = "all" | "people" | "posts"

// ===== Types =====
interface SearchUser {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  bio: string | null
  isVerified: boolean
  isFriend: boolean
  requestSent: boolean
  requestReceived: boolean
}

interface SearchPost {
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
  _count: {
    likes: number
    comments: number
    shares: number
  }
}

interface SearchResponse {
  users: SearchUser[]
  posts: SearchPost[]
  error?: string
}

interface Suggestion {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  bio: string | null
  mutualFriends: number
}

export function SearchView() {
  const {
    searchQuery,
    setSearchQuery,
    openProfile,
    openConversation,
  } = useAppStore()
  const { toast } = useToast()

  const [inputValue, setInputValue] = useState(searchQuery)
  const [results, setResults] = useState<{ users: SearchUser[]; posts: SearchPost[] }>({
    users: [],
    posts: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  // Per-row action flags
  const [requestingId, setRequestingId] = useState<string | null>(null)
  // Track which user ids had a request just sent (optimistic)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  // Suggestions for empty state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  // ===== Debounced search =====
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(
    async (q: string, signal: AbortSignal) => {
      const trimmed = q.trim()
      if (!trimmed) {
        setResults({ users: [], posts: [] })
        setHasSearched(false)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmed)}`,
          { signal }
        )
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as SearchResponse
          throw new Error(data.error || "Gagal mencari")
        }
        const data = (await res.json()) as SearchResponse
        setResults({ users: data.users || [], posts: data.posts || [] })
        setHasSearched(true)
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        setError(e instanceof Error ? e.message : "Terjadi kesalahan")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Sync store query → input (when external changes, e.g. header search)
  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  // Debounced effect: re-run search when inputValue changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Update store on every keystroke so other components can react
    setSearchQuery(inputValue)

    debounceRef.current = setTimeout(() => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller
      void runSearch(inputValue, controller.signal)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue, runSearch, setSearchQuery])

  // Initial mount: trigger search immediately if there's a query
  useEffect(() => {
    if (searchQuery.trim()) {
      const controller = new AbortController()
      abortRef.current = controller
      void runSearch(searchQuery, controller.signal)
    }
    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // ===== Fetch suggestions for empty state =====
  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true)
    try {
      const res = await fetch("/api/friends/suggestions")
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions || [])
      }
    } catch {
      // silent
    } finally {
      setSuggestionsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      void fetchSuggestions()
    }
  }, [searchQuery, fetchSuggestions])

  // ===== Actions =====
  const handleSendRequest = async (userId: string) => {
    if (requestingId) return
    setRequestingId(userId)
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: userId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({
          title: "Gagal",
          description: data.error || "Coba lagi nanti",
          variant: "destructive",
        })
      } else if (data.status === "friends") {
        toast({
          title: "Berhasil",
          description: "Kalian kini berteman",
        })
        // Mark as friend in results
        setResults((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId
              ? { ...u, isFriend: true, requestSent: false, requestReceived: false }
              : u
          ),
        }))
      } else {
        toast({
          title: "Permintaan terkirim",
          description: "Menunggu konfirmasi",
        })
        setSentIds((prev) => new Set(prev).add(userId))
        setResults((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId ? { ...u, requestSent: true } : u
          ),
        }))
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setRequestingId(null)
    }
  }

  const handleAcceptRequest = async (userId: string) => {
    if (requestingId) return
    setRequestingId(userId)
    try {
      // We need the requestId, but the search response doesn't return it.
      // Approach: hit /api/friends/requests to find the matching request id.
      const reqRes = await fetch("/api/friends/requests")
      if (!reqRes.ok) {
        toast({ title: "Gagal", variant: "destructive" })
        return
      }
      const reqData = await reqRes.json()
      const matched = (reqData.requests || []).find(
        (r: { senderId: string; id: string }) => r.senderId === userId
      )
      if (!matched) {
        toast({ title: "Permintaan tidak ditemukan", variant: "destructive" })
        return
      }
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: matched.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({
          title: "Gagal",
          description: data.error || "Coba lagi nanti",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Berhasil",
        description: "Kalian kini berteman",
      })
      setResults((prev) => ({
        ...prev,
        users: prev.users.map((u) =>
          u.id === userId
            ? { ...u, isFriend: true, requestReceived: false }
            : u
        ),
      }))
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setRequestingId(null)
    }
  }

  const handleClear = () => {
    setInputValue("")
    setSearchQuery("")
    setResults({ users: [], posts: [] })
    setHasSearched(false)
    setError(null)
  }

  const trimmedQuery = inputValue.trim()
  const totalResults = results.users.length + results.posts.length

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Header ===== */}
      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md shadow-rose-500/30">
            <SearchIcon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cari</h1>
            <p className="text-xs text-muted-foreground">
              Temukan teman, username, atau postingan
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Cari teman, username, atau postingan..."
            className="pl-9 pr-10 h-11 bg-muted/60 border-transparent focus-visible:bg-background text-sm sm:text-base"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
              aria-label="Hapus pencarian"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {hasSearched && (
          <div className="flex gap-1 mt-3 p-1 bg-muted/60 rounded-xl">
            {[
              { value: "all" as const, label: "Semua", count: results.users.length + results.posts.length },
              { value: "people" as const, label: "Pengguna", count: results.users.length },
              { value: "posts" as const, label: "Postingan", count: results.posts.length },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    activeTab === tab.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== Body ===== */}
      <div className="px-2 sm:px-4 py-4">
        {!trimmedQuery ? (
          <EmptyQueryState
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            onPick={(name) => setInputValue(name)}
            onViewProfile={openProfile}
          />
        ) : loading ? (
          <SearchLoadingSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6">
            <div className="size-16 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-4">
              <AlertCircle className="size-8" />
            </div>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                const controller = new AbortController()
                abortRef.current = controller
                void runSearch(inputValue, controller.signal)
              }}
            >
              <RefreshCw className="size-4" />
              Coba lagi
            </Button>
          </div>
        ) : hasSearched && totalResults === 0 ? (
          <NoResultsState query={trimmedQuery} />
        ) : (
          <div className="space-y-6">
            {/* ===== Users ===== */}
            {(activeTab === "all" || activeTab === "people") && (
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Users className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Pengguna</h2>
                  {results.users.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {results.users.length}
                    </Badge>
                  )}
                </div>

                {results.users.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-1">
                    Tidak ada pengguna yang cocok.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {results.users.map((user) => (
                      <UserResultRow
                        key={user.id}
                        user={user}
                        sent={sentIds.has(user.id)}
                        loading={requestingId === user.id}
                        onSendRequest={() => handleSendRequest(user.id)}
                        onAcceptRequest={() => handleAcceptRequest(user.id)}
                        onViewProfile={() => openProfile(user.id)}
                        onMessage={() => openConversation("", user.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ===== Posts ===== */}
            {(activeTab === "all" || activeTab === "posts") && results.posts.length > 0 && (
              <>
                {activeTab === "all" && results.users.length > 0 && <Separator className="my-2" />}
                <section>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <FileText className="size-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">Postingan</h2>
                    {results.posts.length > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {results.posts.length}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    {results.posts.map((post) => (
                      <PostResultCard
                        key={post.id}
                        post={post}
                        query={trimmedQuery}
                        onViewAuthor={() => openProfile(post.author.id)}
                      />
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// ===== Sub-component: UserResultRow =====
// =====================================================
function UserResultRow({
  user,
  sent,
  loading,
  onSendRequest,
  onAcceptRequest,
  onViewProfile,
  onMessage,
}: {
  user: SearchUser
  sent: boolean
  loading: boolean
  onSendRequest: () => void
  onAcceptRequest: () => void
  onViewProfile: () => void
  onMessage: () => void
}) {
  return (
    <Card className="p-3 sm:p-4 flex items-start gap-3 sm:gap-4 hover:shadow-md transition-shadow border-border/60">
      <button
        onClick={onViewProfile}
        className="shrink-0 rounded-full"
        aria-label={`Lihat profil ${user.name}`}
      >
        <UserAvatar
          src={user.avatarUrl}
          name={user.name}
          seed={user.id}
          size="lg"
          className="ring-1 ring-border"
        />
      </button>

      <div className="flex-1 min-w-0">
        <button
          onClick={onViewProfile}
          className="font-semibold text-sm sm:text-base hover:underline truncate text-left block max-w-full"
        >
          {user.name}
          {user.isVerified && (
            <CheckCircle2 className="inline-block size-3.5 ml-1 text-primary align-text-bottom" />
          )}
        </button>
        <div className="text-xs text-muted-foreground truncate">
          @{user.username}
        </div>
        {user.bio && (
          <p className="text-sm text-muted-foreground clamp-2 mt-1">
            {user.bio}
          </p>
        )}

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {user.isFriend ? (
            <>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <UserCheck className="size-3" />
                Teman
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={onMessage}
              >
                <MessageCircle className="size-3.5" />
                Pesan
              </Button>
            </>
          ) : user.requestSent || sent ? (
            <Button variant="secondary" size="sm" className="h-8" disabled>
              <Clock className="size-3.5" />
              Terkirim
            </Button>
          ) : user.requestReceived ? (
            <Button
              size="sm"
              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={onAcceptRequest}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserCheck className="size-3.5" />
              )}
              Terima
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8"
              onClick={onSendRequest}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              Tambah
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

// =====================================================
// ===== Sub-component: PostResultCard =====
// =====================================================
function PostResultCard({
  post,
  query,
  onViewAuthor,
}: {
  post: SearchPost
  query: string
  onViewAuthor: () => void
}) {
  return (
    <Card
      className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer border-border/60 group"
      onClick={onViewAuthor}
    >
      {/* Author row */}
      <div className="flex items-center gap-2.5 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewAuthor()
          }}
          className="shrink-0 rounded-full"
          aria-label={`Lihat profil ${post.author.name}`}
        >
          <UserAvatar
            src={post.author.avatarUrl}
            name={post.author.name}
            seed={post.author.id}
            size="sm"
          />
        </button>
        <div className="min-w-0 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onViewAuthor()
            }}
            className="font-medium text-sm hover:underline truncate block max-w-full text-left"
          >
            {post.author.name}
            {post.author.isVerified && (
              <CheckCircle2 className="inline-block size-3 ml-0.5 text-primary align-text-bottom" />
            )}
          </button>
          <div className="text-[11px] text-muted-foreground">
            @{post.author.username} · {formatRelativeTime(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Content (clamp 3) */}
      <p
        className="text-sm text-foreground/90 clamp-3 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlightQuery(escapeHtml(post.content), query),
        }}
      />

      {/* Stats */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="size-3.5" />
          {formatNumber(post._count.likes)}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="size-3.5" />
          {formatNumber(post._count.comments)}
        </span>
      </div>
    </Card>
  )
}

// =====================================================
// ===== Sub-components: Empty / No-results =====
// =====================================================
function EmptyQueryState({
  suggestions,
  suggestionsLoading,
  onPick,
  onViewProfile,
}: {
  suggestions: Suggestion[]
  suggestionsLoading: boolean
  onPick: (name: string) => void
  onViewProfile: (id: string) => void
}) {
  const popularTags = [
    "Teman",
    "Connecta",
    "Sapaan",
    "Halo",
    "Selamat",
  ]

  return (
    <div className="py-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center py-8 px-4 mb-4">
        <div className="size-20 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 flex items-center justify-center text-primary mb-4">
          <SearchIcon className="size-10" />
        </div>
        <h2 className="font-semibold text-lg mb-1">
          Cari di Connecta
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Cari teman, username, atau postingan untuk menemukan orang dan
          konten yang Anda cari.
        </p>
      </div>

      {/* Popular search tags */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
          Pencarian populer
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onPick(tag)}
              className="px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions (people you may know) */}
      <div>
        <div className="flex items-center gap-2 mb-3 px-1">
          <TrendingUp className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">Mungkin Anda kenal</h3>
        </div>

        {suggestionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card p-3 flex items-center gap-3"
              >
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">
            Tidak ada saran saat ini.
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.slice(0, 5).map((s) => (
              <Card
                key={s.id}
                className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow border-border/60"
              >
                <button
                  onClick={() => onViewProfile(s.id)}
                  className="shrink-0 rounded-full"
                  aria-label={`Lihat profil ${s.name}`}
                >
                  <UserAvatar
                    src={s.avatarUrl}
                    name={s.name}
                    seed={s.id}
                    size="md"
                    className="ring-1 ring-border"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onViewProfile(s.id)}
                    className="font-medium text-sm hover:underline truncate block max-w-full text-left"
                  >
                    {s.name}
                  </button>
                  <div className="text-xs text-muted-foreground truncate">
                    @{s.username}
                    {s.mutualFriends > 0 && ` · ${s.mutualFriends} teman bersama`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => onPick(s.name)}
                >
                  <SearchIcon className="size-3.5" />
                  Cari
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoResultsState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="size-20 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/60 mb-4">
        <TrendingUp className="size-10" />
      </div>
      <h3 className="font-semibold text-base mb-1">Tidak ada hasil</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Tidak ditemukan pengguna atau postingan untuk{" "}
        <span className="font-semibold text-foreground">&ldquo;{query}&rdquo;</span>.
        Coba kata kunci lain.
      </p>
    </div>
  )
}

// =====================================================
// ===== Skeleton =====
// =====================================================
function SearchLoadingSkeleton() {
  return (
    <div className="space-y-6 py-2">
      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card p-3 sm:p-4 flex items-start gap-3"
            >
              <Skeleton className="size-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full mt-2" />
                <Skeleton className="h-8 w-24 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3 px-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card p-3 sm:p-4"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-1.5" />
              <Skeleton className="h-3 w-5/6 mb-1.5" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// =====================================================
// ===== Utilities =====
// =====================================================
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function highlightQuery(html: string, query: string): string {
  if (!query.trim()) return html
  // Escape regex special chars from query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`(${escaped})`, "gi")
  return html.replace(
    re,
    '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>'
  )
}
