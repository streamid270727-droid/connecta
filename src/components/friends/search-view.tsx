"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import {
  useSendFriendRequest,
  useAcceptFriendRequest,
  useFriendSuggestions,
} from "@/hooks/api/use-friends"
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

export function SearchView() {
  const { searchQuery, setSearchQuery, openProfile, openConversation } = useAppStore()
  const { toast } = useToast()

  const [inputValue, setInputValue] = useState(searchQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trimmedQuery = inputValue.trim()
  const isSearchReady = !!debouncedQuery && debouncedQuery.trim().length >= 2

  // ===== Debounced search =====
  useEffect(() => {
    setInputValue(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchQuery(inputValue)

    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(inputValue)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue, setSearchQuery])

  // ===== Search query =====
  const {
    data: searchResults,
    isLoading: loading,
    error: searchError,
    refetch,
  } = useQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery.trim()],
    queryFn: async ({ signal }) => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery.trim())}`, {
        signal,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as SearchResponse
        throw new Error(data.error || "Gagal mencari")
      }
      return res.json()
    },
    enabled: isSearchReady,
    staleTime: 30_000,
  })

  const results = searchResults
    ? { users: searchResults.users || [], posts: searchResults.posts || [] }
    : { users: [], posts: [] }
  const hasSearched = isSearchReady && !loading
  const totalResults = results.users.length + results.posts.length
  const error = searchError instanceof Error ? searchError.message : null

  // ===== Suggestions =====
  const { data: suggestions = [], isLoading: suggestionsLoading } = useFriendSuggestions()

  // ===== Mutations =====
  const sendRequestMutation = useSendFriendRequest()
  const acceptRequestMutation = useAcceptFriendRequest()

  // ===== Actions =====
  const handleSendRequest = (userId: string) => {
    if (sendRequestMutation.isPending) return
    sendRequestMutation.mutate(userId, {
      onSuccess: (data) => {
        if (data.status === "friends") {
          toast({
            title: "Berhasil",
            description: "Kalian kini berteman",
          })
        } else {
          toast({
            title: "Permintaan terkirim",
            description: "Menunggu konfirmasi",
          })
          setSentIds((prev) => new Set(prev).add(userId))
        }
      },
      onError: () => {
        toast({
          title: "Gagal",
          description: "Coba lagi nanti",
          variant: "destructive",
        })
      },
    })
  }

  const handleAcceptRequest = async (userId: string) => {
    if (acceptRequestMutation.isPending) return
    try {
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
      acceptRequestMutation.mutate(matched.id, {
        onSuccess: () => {
          toast({
            title: "Berhasil",
            description: "Kalian kini berteman",
          })
        },
        onError: () => {
          toast({
            title: "Gagal",
            description: "Coba lagi nanti",
            variant: "destructive",
          })
        },
      })
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    }
  }

  const handleClear = () => {
    setInputValue("")
    setSearchQuery("")
    setDebouncedQuery("")
  }

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Header ===== */}
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/30">
            <SearchIcon className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cari</h1>
            <p className="text-muted-foreground text-xs">Temukan teman, username, atau postingan</p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder="Cari teman, username, atau postingan..."
            className="bg-muted/60 focus-visible:bg-background h-11 border-transparent pr-10 pl-9 text-sm sm:text-base"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="hover:bg-accent text-muted-foreground absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full"
              aria-label="Hapus pencarian"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        {hasSearched && (
          <div className="bg-muted/60 mt-3 flex gap-1 rounded-xl p-1">
            {[
              {
                value: "all" as const,
                label: "Semua",
                count: results.users.length + results.posts.length,
              },
              { value: "people" as const, label: "Pengguna", count: results.users.length },
              { value: "posts" as const, label: "Postingan", count: results.posts.length },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  activeTab === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px]",
                      activeTab === tab.value
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ===== Body ===== */}
      <div className="px-2 py-4 sm:px-4">
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
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="bg-destructive/10 text-destructive mb-4 flex size-16 items-center justify-center rounded-2xl">
              <AlertCircle className="size-8" />
            </div>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm">{error}</p>
            <Button variant="outline" onClick={() => refetch()}>
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
                <div className="mb-3 flex items-center gap-2 px-1">
                  <Users className="text-muted-foreground size-4" />
                  <h2 className="text-sm font-semibold">Pengguna</h2>
                  {results.users.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {results.users.length}
                    </Badge>
                  )}
                </div>

                {results.users.length === 0 ? (
                  <p className="text-muted-foreground px-1 text-xs">
                    Tidak ada pengguna yang cocok.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {results.users.map((user) => (
                      <UserResultRow
                        key={user.id}
                        user={user}
                        sent={sentIds.has(user.id)}
                        loading={sendRequestMutation.isPending || acceptRequestMutation.isPending}
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
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <FileText className="text-muted-foreground size-4" />
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
    <Card className="border-border/60 flex items-start gap-3 p-3 transition-shadow hover:shadow-md sm:gap-4 sm:p-4">
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
          className="ring-border ring-1"
        />
      </button>

      <div className="min-w-0 flex-1">
        <button
          onClick={onViewProfile}
          className="block max-w-full truncate text-left text-sm font-semibold hover:underline sm:text-base"
        >
          {user.name}
          {user.isVerified && (
            <CheckCircle2 className="text-primary ml-1 inline-block size-3.5 align-text-bottom" />
          )}
        </button>
        <div className="text-muted-foreground truncate text-xs">@{user.username}</div>
        {user.bio && <p className="text-muted-foreground clamp-2 mt-1 text-sm">{user.bio}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {user.isFriend ? (
            <>
              <Badge
                variant="secondary"
                className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              >
                <UserCheck className="size-3" />
                Teman
              </Badge>
              <Button variant="outline" size="sm" className="h-8" onClick={onMessage}>
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
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600"
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
            <Button size="sm" className="h-8" onClick={onSendRequest} disabled={loading}>
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
      className="border-border/60 group cursor-pointer p-3 transition-shadow hover:shadow-md sm:p-4"
      onClick={onViewAuthor}
    >
      {/* Author row */}
      <div className="mb-2 flex items-center gap-2.5">
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
            className="block max-w-full truncate text-left text-sm font-medium hover:underline"
          >
            {post.author.name}
            {post.author.isVerified && (
              <CheckCircle2 className="text-primary ml-0.5 inline-block size-3 align-text-bottom" />
            )}
          </button>
          <div className="text-muted-foreground text-[11px]">
            @{post.author.username} · {formatRelativeTime(post.createdAt)}
          </div>
        </div>
      </div>

      {/* Content (clamp 3) */}
      <p
        className="text-foreground/90 clamp-3 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlightQuery(escapeHtml(post.content), query),
        }}
      />

      {/* Stats */}
      <div className="text-muted-foreground mt-3 flex items-center gap-4 text-xs">
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
  suggestions: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    bio: string | null
    mutualFriends: number
  }[]
  suggestionsLoading: boolean
  onPick: (name: string) => void
  onViewProfile: (id: string) => void
}) {
  const popularTags = ["Teman", "Connecta", "Sapaan", "Halo", "Selamat"]

  return (
    <div className="py-6">
      {/* Hero */}
      <div className="mb-4 flex flex-col items-center px-4 py-8 text-center">
        <div className="text-primary mb-4 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10">
          <SearchIcon className="size-10" />
        </div>
        <h2 className="mb-1 text-lg font-semibold">Cari di Connecta</h2>
        <p className="text-muted-foreground max-w-sm text-sm">
          Cari teman, username, atau postingan untuk menemukan orang dan konten yang Anda cari.
        </p>
      </div>

      {/* Popular search tags */}
      <div className="mb-8">
        <h3 className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-wide uppercase">
          Pencarian populer
        </h3>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onPick(tag)}
              className="bg-muted hover:bg-accent rounded-full px-3 py-1.5 text-sm transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions (people you may know) */}
      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <TrendingUp className="text-primary size-4" />
          <h3 className="text-sm font-semibold">Mungkin Anda kenal</h3>
        </div>

        {suggestionsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-border/60 bg-card flex items-center gap-3 rounded-xl border p-3"
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
          <p className="text-muted-foreground px-1 text-xs">Tidak ada saran saat ini.</p>
        ) : (
          <div className="space-y-2">
            {suggestions.slice(0, 5).map((s) => (
              <Card
                key={s.id}
                className="border-border/60 flex items-center gap-3 p-3 transition-shadow hover:shadow-md"
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
                    className="ring-border ring-1"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onViewProfile(s.id)}
                    className="block max-w-full truncate text-left text-sm font-medium hover:underline"
                  >
                    {s.name}
                  </button>
                  <div className="text-muted-foreground truncate text-xs">
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
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="bg-muted text-muted-foreground/60 mb-4 flex size-20 items-center justify-center rounded-2xl">
        <TrendingUp className="size-10" />
      </div>
      <h3 className="mb-1 text-base font-semibold">Tidak ada hasil</h3>
      <p className="text-muted-foreground max-w-sm text-sm">
        Tidak ditemukan pengguna atau postingan untuk{" "}
        <span className="text-foreground font-semibold">&ldquo;{query}&rdquo;</span>. Coba kata
        kunci lain.
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
        <div className="mb-3 flex items-center gap-2 px-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="border-border/60 bg-card flex items-start gap-3 rounded-xl border p-3 sm:p-4"
            >
              <Skeleton className="size-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-2 h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2 px-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border-border/60 bg-card rounded-xl border p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2.5">
                <Skeleton className="size-8 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <Skeleton className="mb-1.5 h-3 w-full" />
              <Skeleton className="mb-1.5 h-3 w-5/6" />
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
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp(`(${escaped})`, "gi")
  return html.replace(re, '<mark class="bg-primary/20 text-primary rounded px-0.5">$1</mark>')
}
