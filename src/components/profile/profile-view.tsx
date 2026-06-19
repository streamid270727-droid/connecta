"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
import {
  formatShortDate,
  getCoverGradient,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  CheckCircle2,
  MapPin,
  Calendar,
  Camera,
  Loader2,
  Pencil,
  MoreHorizontal,
  UserPlus,
  UserCheck,
  MessageCircle,
  ImageIcon,
  Users,
  Grid3x3,
  Lock,
  Globe,
  RefreshCw,
  AlertCircle,
  Clock,
  Heart,
} from "lucide-react"

interface ProfileUser {
  id: string
  name: string
  username: string
  email: string | null
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  location: string | null
  birthDate: string | null
  phone: string | null
  isPrivate: boolean
  isVerified: boolean
  createdAt: string
  isOwnProfile: boolean
  isFriend: boolean
  friendRequestSent: boolean
  friendRequestReceived: boolean
  requestId: string | null
  friendsCount: number
  postsCount: number
}

interface ProfileFriend {
  id: string
  name: string
  username: string
  avatarUrl: string | null
  isVerified: boolean
}

interface ProfileResponse {
  user: ProfileUser
  friends: ProfileFriend[]
  posts: FeedPost[]
  nextCursor: string | null
}

export function ProfileView() {
  const { data: session } = useSession()
  const { profileTargetId, openProfile, openConversation } = useAppStore()
  const { toast } = useToast()

  const targetId = profileTargetId || session?.user?.id || null

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [friends, setFriends] = useState<ProfileFriend[]>([])
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"posts" | "friends" | "photos">("posts")

  // Friend action loading flags
  const [friendActionLoading, setFriendActionLoading] = useState(false)
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null)

  const [editOpen, setEditOpen] = useState(false)

  const loadingMoreRef = useRef(false)

  // ----- Fetch profile -----
  const fetchProfile = useCallback(async () => {
    if (!targetId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/users/${targetId}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Gagal memuat profil")
      }
      const data: ProfileResponse = await res.json()
      setUser(data.user)
      setFriends(data.friends)
      setPosts(data.posts)
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan")
    } finally {
      setLoading(false)
    }
  }, [targetId])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  // ----- Infinite scroll for posts (only when not private / is friend / own profile) -----
  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current || !cursor || !hasMore || !targetId) return
    const canViewPosts =
      user && (!user.isPrivate || user.isFriend || user.isOwnProfile)
    if (!canViewPosts) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/users/${targetId}?cursor=${cursor}`)
      if (!res.ok) throw new Error("Gagal memuat")
      const data: ProfileResponse = await res.json()
      setPosts((prev) => {
        const ids = new Set(prev.map((p) => p.id))
        return [...prev, ...data.posts.filter((p) => !ids.has(p.id))]
      })
      setCursor(data.nextCursor)
      setHasMore(!!data.nextCursor)
    } catch {
      toast({
        title: "Gagal memuat postingan",
        variant: "destructive",
      })
    } finally {
      setLoadingMore(false)
      loadingMoreRef.current = false
    }
  }, [cursor, hasMore, targetId, user, toast])

  useEffect(() => {
    const handler = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 800 &&
        hasMore &&
        !loadingMore &&
        !loading
      ) {
        void loadMorePosts()
      }
    }
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [hasMore, loadingMore, loading, loadMorePosts])

  // ----- Local post update/delete handlers -----
  const handlePostUpdate = useCallback((id: string, updates: Partial<FeedPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }, [])
  const handlePostDelete = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
    setUser((prev) =>
      prev ? { ...prev, postsCount: Math.max(0, prev.postsCount - 1) } : prev
    )
  }, [])

  // ----- Friend actions -----
  const sendFriendRequest = async () => {
    if (!user || friendActionLoading) return
    setFriendActionLoading(true)
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Permintaan terkirim", description: "Menunggu konfirmasi" })
        setUser((prev) =>
          prev
            ? {
                ...prev,
                friendRequestSent: true,
                requestId: data.requestId ?? prev.requestId,
              }
            : prev
        )
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setFriendActionLoading(false)
    }
  }

  const acceptRequest = async () => {
    if (!user?.requestId || friendActionLoading) return
    setFriendActionLoading(true)
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: user.requestId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Berhasil", description: "Kalian kini berteman" })
        setUser((prev) =>
          prev
            ? {
                ...prev,
                isFriend: true,
                friendRequestReceived: false,
                requestId: null,
                friendsCount: prev.friendsCount + 1,
              }
            : prev
        )
        void fetchProfile()
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setFriendActionLoading(false)
    }
  }

  const rejectRequest = async () => {
    if (!user?.requestId || friendActionLoading) return
    setFriendActionLoading(true)
    try {
      const res = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: user.requestId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Permintaan ditolak" })
        setUser((prev) =>
          prev
            ? {
                ...prev,
                friendRequestReceived: false,
                requestId: null,
              }
            : prev
        )
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setFriendActionLoading(false)
    }
  }

  const unfriend = async () => {
    if (!user || friendActionLoading) return
    setFriendActionLoading(true)
    try {
      const res = await fetch(`/api/friends/${user.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Berhasil", description: "Pertemanan dihapus" })
        setUser((prev) =>
          prev
            ? {
                ...prev,
                isFriend: false,
                friendsCount: Math.max(0, prev.friendsCount - 1),
              }
            : prev
        )
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setFriendActionLoading(false)
    }
  }

  const handleMessage = () => {
    if (!user) return
    openConversation("", user.id)
  }

  // ----- Photo grid (all images from posts) -----
  const photos = useMemo(() => {
    const out: string[] = []
    for (const p of posts) {
      if (p.images?.length) out.push(...p.images)
    }
    return out
  }, [posts])

  // ----- Render -----
  if (loading) {
    return <ProfileSkeleton />
  }

  if (error || !user) {
    return (
      <div className="text-center py-16 px-4">
        <AlertCircle className="size-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground mb-4">
          {error || "Pengguna tidak ditemukan"}
        </p>
        <Button onClick={fetchProfile} variant="outline">
          <RefreshCw className="size-4" />
          Coba lagi
        </Button>
      </div>
    )
  }

  const canViewPosts = !user.isPrivate || user.isFriend || user.isOwnProfile
  const photosCount = photos.length

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Header ===== */}
      <div className="relative">
        {/* Cover */}
        <div className="relative h-44 sm:h-52 lg:h-56 overflow-hidden">
          {user.coverUrl ? (
            <img
              src={user.coverUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full bg-gradient-to-br",
                getCoverGradient(user.id)
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-rose-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-fuchsia-500/20 blur-3xl" />
            </div>
          )}
          {/* Subtle gradient at bottom for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          {/* Rounded bottom */}
          <div className="absolute bottom-0 inset-x-0 h-6 bg-background rounded-t-3xl" />
        </div>

        {/* Avatar + actions row */}
        <div className="px-4 sm:px-6 -mt-16 sm:-mt-20 relative">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="relative">
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                seed={user.id}
                size="2xl"
                className="ring-4 ring-background shadow-xl"
              />
              {user.isOwnProfile && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="absolute bottom-1 right-1 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                  aria-label="Edit profil"
                >
                  <Camera className="size-4" />
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {user.isOwnProfile ? (
                <Button onClick={() => setEditOpen(true)} variant="outline">
                  <Pencil className="size-4" />
                  Edit Profil
                </Button>
              ) : user.isFriend ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary">
                      <UserCheck className="size-4" />
                      Teman
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={handleMessage}>
                      <MessageCircle className="size-4" />
                      Kirim Pesan
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={unfriend}
                      disabled={friendActionLoading}
                    >
                      <UserPlus className="size-4 rotate-180" />
                      Hapus Teman
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : user.friendRequestReceived ? (
                <>
                  <Button
                    onClick={acceptRequest}
                    disabled={friendActionLoading}
                  >
                    {friendActionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserCheck className="size-4" />
                    )}
                    Terima
                  </Button>
                  <Button
                    onClick={rejectRequest}
                    variant="outline"
                    disabled={friendActionLoading}
                  >
                    Tolak
                  </Button>
                </>
              ) : user.friendRequestSent ? (
                <Button variant="secondary" disabled>
                  <Clock className="size-4" />
                  Permintaan Terkirim
                </Button>
              ) : (
                <Button
                  onClick={sendFriendRequest}
                  disabled={friendActionLoading}
                >
                  {friendActionLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserPlus className="size-4" />
                  )}
                  Tambah Teman
                </Button>
              )}

              {!user.isOwnProfile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleMessage}
                  aria-label="Kirim pesan"
                >
                  <MessageCircle className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Name + meta */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {user.name}
              </h1>
              {user.isVerified && (
                <CheckCircle2 className="size-5 fill-primary text-primary-foreground" />
              )}
              {user.isPrivate && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="size-3" />
                  Privat
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>

            {user.bio && (
              <p className="text-sm mt-2 whitespace-pre-wrap break-words leading-relaxed">
                {user.bio}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {user.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                Bergabung {formatShortDate(user.createdAt)}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <button
                onClick={() => setActiveTab("posts")}
                className="hover:underline"
              >
                <span className="font-bold">{user.postsCount}</span>{" "}
                <span className="text-muted-foreground">Postingan</span>
              </button>
              <button
                onClick={() => setActiveTab("friends")}
                className="hover:underline"
              >
                <span className="font-bold">{user.friendsCount}</span>{" "}
                <span className="text-muted-foreground">Teman</span>
              </button>
              <button
                onClick={() => setActiveTab("photos")}
                className="hover:underline"
              >
                <span className="font-bold">{photosCount}</span>{" "}
                <span className="text-muted-foreground">Foto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="px-2 sm:px-4 mt-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="sticky top-14 sm:top-16 z-20 bg-background/80 glass -mx-2 sm:-mx-4 px-2 sm:px-4 py-2 border-b">
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="posts" className="gap-1.5">
                <Grid3x3 className="size-3.5" />
                Postingan
              </TabsTrigger>
              <TabsTrigger value="friends" className="gap-1.5">
                <Users className="size-3.5" />
                Teman
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-1.5">
                <ImageIcon className="size-3.5" />
                Foto
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Posts tab */}
          <TabsContent value="posts" className="mt-3">
            {!canViewPosts ? (
              <PrivateProfileNotice />
            ) : posts.length === 0 ? (
              <EmptyPosts isOwn={user.isOwnProfile} />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {posts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!hasMore && posts.length > 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Heart className="size-5 mx-auto mb-2 opacity-40" />
                    Tidak ada lagi postingan
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Friends tab */}
          <TabsContent value="friends" className="mt-3">
            {!canViewPosts && !user.isOwnProfile ? (
              <PrivateProfileNotice />
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {user.isOwnProfile
                    ? "Anda belum memiliki teman"
                    : "Belum ada teman untuk ditampilkan"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => openProfile(f.id)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border bg-card hover:bg-accent/50 hover:shadow-sm transition-all"
                  >
                    <UserAvatar
                      src={f.avatarUrl}
                      name={f.name}
                      seed={f.id}
                      size="xl"
                    />
                    <div className="text-center min-w-0 w-full">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium text-sm truncate">
                          {f.name}
                        </span>
                        {f.isVerified && (
                          <CheckCircle2 className="size-3 fill-primary text-primary-foreground shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        @{f.username}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Photos tab */}
          <TabsContent value="photos" className="mt-3">
            {!canViewPosts ? (
              <PrivateProfileNotice />
            ) : photos.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="size-10 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {user.isOwnProfile
                    ? "Anda belum mengunggah foto"
                    : "Belum ada foto untuk ditampilkan"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
                {photos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    onClick={() => setPhotoLightbox(url)}
                    className="aspect-square rounded-md overflow-hidden bg-muted hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== Edit Profile Dialog ===== */}
      {user.isOwnProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          onSaved={(updated) => {
            setUser((prev) => (prev ? { ...prev, ...updated } : prev))
            void fetchProfile()
          }}
        />
      )}

      {/* ===== Photo lightbox ===== */}
      <Dialog
        open={!!photoLightbox}
        onOpenChange={(o) => !o && setPhotoLightbox(null)}
      >
        <DialogContent
          className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none"
          showCloseButton
        >
          <div className="flex items-center justify-center min-h-[60vh] max-h-[90vh]">
            {photoLightbox && (
              <img
                src={photoLightbox}
                alt=""
                className="max-w-full max-h-[90vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-44 sm:h-52 w-full rounded-none" />
      <div className="px-4 sm:px-6 -mt-16">
        <div className="flex items-end justify-between">
          <Skeleton className="size-24 rounded-full ring-4 ring-background" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-full max-w-md" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 mt-4">
        <Skeleton className="h-9 w-full max-w-md" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function EmptyPosts({ isOwn }: { isOwn: boolean }) {
  const setView = useAppStore((s) => s.setView)
  return (
    <div className="text-center py-12 px-4">
      <div className="size-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-950/30 dark:to-pink-950/30 flex items-center justify-center mx-auto mb-3">
        <Grid3x3 className="size-8 text-primary" />
      </div>
      <h3 className="font-semibold mb-1">
        {isOwn ? "Anda belum memposting apapun" : "Belum ada postingan"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        {isOwn
          ? "Bagikan momen pertama Anda untuk mulai terhubung dengan teman."
          : "Pengguna ini belum membagikan apapun."}
      </p>
      {isOwn && (
        <Button onClick={() => setView("feed")}>
          <Pencil className="size-4" />
          Buat Postingan
        </Button>
      )}
    </div>
  )
}

function PrivateProfileNotice() {
  return (
    <div className="text-center py-12 px-4">
      <div className="size-16 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-950/30 dark:to-pink-950/30 flex items-center justify-center mx-auto mb-3">
        <Lock className="size-8 text-primary" />
      </div>
      <h3 className="font-semibold mb-1">Akun Privat</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Untuk melihat postingan pengguna ini, kirim permintaan teman dan tunggu
        hingga disetujui.
      </p>
    </div>
  )
}

// ============================================================
// Edit Profile Dialog
// ============================================================

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ProfileUser
  onSaved: (updated: Partial<ProfileUser>) => void
}

function EditProfileDialog({
  open,
  onOpenChange,
  user,
  onSaved,
}: EditProfileDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(user.bio || "")
  const [location, setLocation] = useState(user.location || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [birthDate, setBirthDate] = useState(
    user.birthDate ? user.birthDate.slice(0, 10) : ""
  )
  const [isPrivate, setIsPrivate] = useState(user.isPrivate)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || "")
  const [coverUrl, setCoverUrl] = useState(user.coverUrl || "")

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Re-sync when opening
  useEffect(() => {
    if (open) {
      setName(user.name)
      setBio(user.bio || "")
      setLocation(user.location || "")
      setPhone(user.phone || "")
      setBirthDate(user.birthDate ? user.birthDate.slice(0, 10) : "")
      setIsPrivate(user.isPrivate)
      setAvatarUrl(user.avatarUrl || "")
      setCoverUrl(user.coverUrl || "")
    }
  }, [open, user])

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast({ title: "Gagal mengunggah", description: data.error, variant: "destructive" })
      return null
    }
    const data = await res.json()
    return data.url as string
  }

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Ukuran file terlalu besar (maks 4MB)", variant: "destructive" })
      return
    }
    setUploadingAvatar(true)
    try {
      const url = await uploadFile(file)
      if (url) setAvatarUrl(url)
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Ukuran file terlalu besar (maks 4MB)", variant: "destructive" })
      return
    }
    setUploadingCover(true)
    try {
      const url = await uploadFile(file)
      if (url) setCoverUrl(url)
    } finally {
      setUploadingCover(false)
      if (coverInputRef.current) coverInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (saving) return
    if (name.trim().length < 2) {
      toast({ title: "Nama minimal 2 karakter", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          location: location.trim(),
          phone: phone.trim(),
          birthDate: birthDate || null,
          avatarUrl,
          coverUrl,
          isPrivate,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast({ title: "Gagal menyimpan", description: data.error, variant: "destructive" })
      } else {
        const data = await res.json()
        toast({ title: "Profil diperbarui", description: "Perubahan telah disimpan" })
        onSaved({
          name: data.user.name,
          bio: data.user.bio,
          location: data.user.location,
          phone: data.user.phone,
          birthDate: data.user.birthDate,
          isPrivate: data.user.isPrivate,
          avatarUrl: data.user.avatarUrl,
          coverUrl: data.user.coverUrl,
        })
        onOpenChange(false)
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profil</DialogTitle>
          <DialogDescription>
            Perbarui informasi profil dan foto Anda.
          </DialogDescription>
        </DialogHeader>

        {/* Cover preview */}
        <div className="space-y-2">
          <Label>Foto Sampul</Label>
          <div className="relative h-28 rounded-xl overflow-hidden bg-muted">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className={cn("w-full h-full bg-gradient-to-br", getCoverGradient(user.id))} />
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-2 right-2 size-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors"
              aria-label="Ubah sampul"
            >
              {uploadingCover ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleCoverSelect}
            />
          </div>
        </div>

        {/* Avatar preview */}
        <div className="space-y-2">
          <Label>Foto Profil</Label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <UserAvatar
                src={avatarUrl}
                name={name}
                seed={user.id}
                size="xl"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                aria-label="Ubah avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
            </div>
            <div className="text-xs text-muted-foreground">
              Klik ikon kamera untuk mengunggah foto baru.
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="edit-name">Nama</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="edit-bio">Bio</Label>
          <Textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Ceritakan tentang diri Anda..."
          />
          <div className="text-xs text-muted-foreground text-right">
            {bio.length}/200
          </div>
        </div>

        {/* Location + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="edit-location">Lokasi</Label>
            <Input
              id="edit-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={100}
              placeholder="Kota, Negara"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telepon</Label>
            <Input
              id="edit-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="+62..."
            />
          </div>
        </div>

        {/* Birth date */}
        <div className="space-y-2">
          <Label htmlFor="edit-birth">Tanggal Lahir</Label>
          <Input
            id="edit-birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        {/* Privacy */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
          <div className="flex items-start gap-2.5">
            {isPrivate ? (
              <Lock className="size-4 text-primary mt-0.5" />
            ) : (
              <Globe className="size-4 text-primary mt-0.5" />
            )}
            <div>
              <div className="text-sm font-medium">Akun Privat</div>
              <div className="text-xs text-muted-foreground">
                Hanya teman yang bisa melihat postingan Anda.
              </div>
            </div>
          </div>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving || uploadingAvatar || uploadingCover}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
