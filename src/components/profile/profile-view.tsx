"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useSession } from "next-auth/react"
import { PostCard, type FeedPost } from "@/components/feed/post-card"
import { UserAvatar } from "@/components/common/user-avatar"
import { OptimizedImage } from "@/components/common/optimized-image"
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
import { formatShortDate, getCoverGradient } from "@/lib/format"
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
  Bookmark,
  Lock,
  Globe,
  RefreshCw,
  AlertCircle,
  Clock,
  Heart,
  Ban,
} from "lucide-react"

import {
  useProfile,
  useProfilePosts,
  useProfilePhotos,
  useSavedPosts,
  useUnsavePost,
  useBlockUser,
} from "@/hooks/api/use-profile"
import { useQueryClient } from "@tanstack/react-query"
import {
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
  useUnfriend,
} from "@/hooks/api/use-friends"
import { EmptyState } from "@/components/common/empty-state"

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

export function ProfileView() {
  const { data: session } = useSession()
  const { profileTargetId, openProfile, openConversation } = useAppStore()
  const { toast } = useToast()
  const qc = useQueryClient()

  const targetId = profileTargetId || session?.user?.id || undefined

  const [activeTab, setActiveTab] = useState<"posts" | "friends" | "photos" | "saved">("posts")
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [localUser, setLocalUser] = useState<ProfileUser | null>(null)

  const profileQuery = useProfile(targetId)

  const user = localUser || (profileQuery.data?.user as ProfileUser | undefined) || null
  const friends = (profileQuery.data?.friends || []) as ProfileFriend[]

  const canViewPosts = user ? !user.isPrivate || user.isFriend || user.isOwnProfile : false

  const postsQuery = useProfilePosts(targetId, canViewPosts)

  const allPosts = useMemo(() => {
    if (!postsQuery.data) return []
    return postsQuery.data.pages.flatMap((page) => page.posts) as FeedPost[]
  }, [postsQuery.data])

  const hasMore = postsQuery.hasNextPage ?? false
  const loadingMore = postsQuery.isFetchingNextPage

  const photosQuery = useProfilePhotos(targetId, !profileQuery.isLoading)

  const allPhotos = photosQuery.data ?? []
  const loadingPhotos = photosQuery.isLoading

  const savedPostsQuery = useSavedPosts()
  const unsavePostMutation = useUnsavePost()

  const sendRequestMutation = useSendFriendRequest()
  const acceptRequestMutation = useAcceptFriendRequest()
  const rejectRequestMutation = useRejectFriendRequest()
  const unfriendMutation = useUnfriend()
  const blockMutation = useBlockUser()

  const handlePostUpdate = useCallback(
    (id: string, updates: Partial<FeedPost>) => {
      qc.setQueryData(["profilePosts", targetId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((p: any) => (p.id === id ? { ...p, ...updates } : p)),
          })),
        }
      })
    },
    [qc, targetId]
  )

  const handlePostDelete = useCallback(
    (id: string) => {
      qc.setQueryData(["profilePosts", targetId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.filter((p: any) => p.id !== id),
          })),
        }
      })
    },
    [qc, targetId]
  )

  useEffect(() => {
    const handler = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 &&
        hasMore &&
        !loadingMore &&
        !profileQuery.isLoading
      ) {
        void postsQuery.fetchNextPage()
      }
    }
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [hasMore, loadingMore, profileQuery.isLoading, postsQuery.fetchNextPage])

  useEffect(() => {
    if (profileQuery.data?.user) {
      setLocalUser(profileQuery.data.user as ProfileUser)
    }
  }, [profileQuery.data?.user])

  const sendFriendRequest = () => {
    if (!user) return
    sendRequestMutation.mutate(user.id, {
      onSuccess: (data) => {
        toast({ title: "Permintaan terkirim", description: "Menunggu konfirmasi" })
        setLocalUser((prev) =>
          prev
            ? {
                ...prev,
                friendRequestSent: true,
              }
            : prev
        )
      },
      onError: (err: any) => {
        toast({ title: "Gagal", description: err.message, variant: "destructive" })
      },
    })
  }

  const acceptRequest = () => {
    if (!user?.requestId) return
    acceptRequestMutation.mutate(user.requestId, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Kalian kini berteman" })
        setLocalUser((prev) =>
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
        profileQuery.refetch()
      },
      onError: (err: any) => {
        toast({ title: "Gagal", description: err.message, variant: "destructive" })
      },
    })
  }

  const rejectRequest = () => {
    if (!user?.requestId) return
    rejectRequestMutation.mutate(user.requestId, {
      onSuccess: () => {
        toast({ title: "Permintaan ditolak" })
        setLocalUser((prev) =>
          prev
            ? {
                ...prev,
                friendRequestReceived: false,
                requestId: null,
              }
            : prev
        )
      },
      onError: (err: any) => {
        toast({ title: "Gagal", description: err.message, variant: "destructive" })
      },
    })
  }

  const unfriend = () => {
    if (!user) return
    unfriendMutation.mutate(user.id, {
      onSuccess: () => {
        toast({ title: "Berhasil", description: "Pertemanan dihapus" })
        setLocalUser((prev) =>
          prev
            ? {
                ...prev,
                isFriend: false,
                friendsCount: Math.max(0, prev.friendsCount - 1),
              }
            : prev
        )
      },
      onError: (err: any) => {
        toast({ title: "Gagal", description: err.message, variant: "destructive" })
      },
    })
  }

  const handleMessage = () => {
    if (!user) return
    openConversation("", user.id)
  }

  const handleBlock = () => {
    if (!user) return
    blockMutation.mutate(user.id, {
      onSuccess: (data) => {
        toast({
          title: data.blocked ? "Diblokir" : "Dibuka blokirannya",
          description: data.blocked
            ? `${user.name} tidak akan bisa melihat profil Anda`
            : `${user.name} telah dibuka blokirannya`,
        })
      },
    })
  }

  const friendActionLoading =
    sendRequestMutation.isPending ||
    acceptRequestMutation.isPending ||
    rejectRequestMutation.isPending ||
    unfriendMutation.isPending

  const blocking = blockMutation.isPending

  if (profileQuery.isLoading) {
    return <ProfileSkeleton />
  }

  if (profileQuery.error || !user) {
    return (
      <EmptyState
        icon={<AlertCircle className="size-10" />}
        title="Pengguna tidak ditemukan"
        description={
          (profileQuery.error as Error)?.message || "Terjadi kesalahan saat memuat profil"
        }
        action={
          <Button onClick={() => profileQuery.refetch()} variant="outline" size="sm">
            <RefreshCw className="size-4" />
            Coba lagi
          </Button>
        }
      />
    )
  }

  const photosCount = allPhotos.length

  return (
    <div className="min-h-screen pb-8">
      {/* ===== Header ===== */}
      <div className="relative">
        {/* Cover */}
        <div className="relative h-44 overflow-hidden sm:h-52 lg:h-56">
          {user.coverUrl ? (
            <OptimizedImage src={user.coverUrl} alt="Cover" fill className="object-cover" />
          ) : (
            <div className={cn("h-full w-full bg-gradient-to-br", getCoverGradient(user.id))}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              {/* Decorative blobs */}
              <div className="absolute -top-10 -right-10 h-44 w-44 rounded-full bg-rose-500/20 blur-3xl dark:bg-rose-500/10" />
              <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-fuchsia-500/20 blur-3xl dark:bg-fuchsia-500/10" />
            </div>
          )}
          {/* Subtle gradient at bottom for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          {/* Rounded bottom */}
          <div className="bg-background absolute inset-x-0 bottom-0 h-6 rounded-t-3xl" />
        </div>

        {/* Avatar + actions row */}
        <div className="relative -mt-16 px-4 sm:-mt-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="relative">
              <UserAvatar
                src={user.avatarUrl}
                name={user.name}
                seed={user.id}
                size="2xl"
                className="ring-background shadow-xl ring-4"
              />
              {user.isOwnProfile && (
                <button
                  onClick={() => setEditOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full shadow-md transition-colors"
                  aria-label="Edit profil"
                >
                  <Camera className="size-4" />
                </button>
              )}
            </div>

            {/* Action buttons */}
            <div className="mb-1 flex flex-wrap items-center gap-2">
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
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={handleBlock}
                      disabled={blocking}
                    >
                      <Ban className="size-4" />
                      {blocking ? "Memblokir..." : "Blokir"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : user.friendRequestReceived ? (
                <>
                  <Button onClick={acceptRequest} disabled={friendActionLoading}>
                    {friendActionLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <UserCheck className="size-4" />
                    )}
                    Terima
                  </Button>
                  <Button onClick={rejectRequest} variant="outline" disabled={friendActionLoading}>
                    Tolak
                  </Button>
                </>
              ) : user.friendRequestSent ? (
                <Button variant="secondary" disabled>
                  <Clock className="size-4" />
                  Permintaan Terkirim
                </Button>
              ) : (
                <Button onClick={sendFriendRequest} disabled={friendActionLoading}>
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
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{user.name}</h1>
              {user.isVerified && (
                <CheckCircle2 className="fill-primary text-primary-foreground size-5" />
              )}
              {user.isPrivate && (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="size-3" />
                  Privat
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">@{user.username}</p>

            {user.bio && (
              <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
                {user.bio}
              </p>
            )}

            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-xs">
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
            <div className="mt-3 flex items-center gap-4 text-sm">
              <button onClick={() => setActiveTab("posts")} className="hover:underline">
                <span className="font-bold">{user.postsCount}</span>{" "}
                <span className="text-muted-foreground">Postingan</span>
              </button>
              <button onClick={() => setActiveTab("friends")} className="hover:underline">
                <span className="font-bold">{user.friendsCount}</span>{" "}
                <span className="text-muted-foreground">Teman</span>
              </button>
              <button onClick={() => setActiveTab("photos")} className="hover:underline">
                <span className="font-bold">{photosCount}</span>{" "}
                <span className="text-muted-foreground">Foto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Tabs ===== */}
      <div className="mt-4 px-2 sm:px-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <div className="bg-background/80 glass sticky top-14 z-20 -mx-2 border-b px-2 py-2 sm:top-16 sm:-mx-4 sm:px-4">
            <TabsList
              className={cn(
                "grid h-9 w-full text-[11px] sm:text-sm",
                user.isOwnProfile ? "grid-cols-4" : "grid-cols-3"
              )}
            >
              <TabsTrigger value="posts" className="min-w-0 gap-1.5 truncate">
                <Grid3x3 className="size-3.5" />
                Postingan
              </TabsTrigger>
              <TabsTrigger value="friends" className="min-w-0 gap-1.5 truncate">
                <Users className="size-3.5" />
                Teman
              </TabsTrigger>
              <TabsTrigger value="photos" className="min-w-0 gap-1.5 truncate">
                <ImageIcon className="size-3.5" />
                Foto
              </TabsTrigger>
              {user.isOwnProfile && (
                <TabsTrigger value="saved" className="min-w-0 gap-1.5 truncate">
                  <Bookmark className="size-3.5" />
                  Tersimpan
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Posts tab */}
          <TabsContent value="posts" className="mt-3">
            {!canViewPosts ? (
              <PrivateProfileNotice />
            ) : allPosts.length === 0 && !postsQuery.isLoading ? (
              <EmptyPosts isOwn={user.isOwnProfile} />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {allPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                  />
                ))}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="text-muted-foreground size-6 animate-spin" />
                  </div>
                )}
                {!hasMore && allPosts.length > 0 && (
                  <div className="text-muted-foreground py-8 text-center text-sm">
                    <Heart className="mx-auto mb-2 size-5 opacity-40" />
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
              <EmptyState
                icon={<Users className="size-10" />}
                title={
                  user.isOwnProfile
                    ? "Anda belum memiliki teman"
                    : "Belum ada teman untuk ditampilkan"
                }
                size="sm"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {friends.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => openProfile(f.id)}
                    className="bg-card hover:bg-accent/50 flex flex-col items-center gap-2 rounded-xl border p-3 transition-all hover:shadow-sm"
                  >
                    <UserAvatar src={f.avatarUrl} name={f.name} seed={f.id} size="xl" />
                    <div className="w-full min-w-0 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="truncate text-sm font-medium">{f.name}</span>
                        {f.isVerified && (
                          <CheckCircle2 className="fill-primary text-primary-foreground size-3 shrink-0" />
                        )}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">@{f.username}</div>
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
            ) : loadingPhotos ? (
              <div className="grid animate-pulse grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-muted aspect-square rounded-md" />
                ))}
              </div>
            ) : allPhotos.length === 0 ? (
              <EmptyState
                icon={<ImageIcon className="size-10" />}
                title={
                  user.isOwnProfile
                    ? "Anda belum mengunggah foto"
                    : "Belum ada foto untuk ditampilkan"
                }
                size="sm"
              />
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:grid-cols-4 sm:gap-2">
                {allPhotos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    onClick={() => setPhotoLightbox(url)}
                    className="bg-muted relative aspect-square overflow-hidden rounded-md transition-opacity hover:opacity-90"
                  >
                    <OptimizedImage src={url} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Saved tab (own profile only) */}
          {user.isOwnProfile && (
            <TabsContent value="saved" className="mt-3">
              <SavedPostsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ===== Edit Profile Dialog ===== */}
      {user.isOwnProfile && (
        <EditProfileDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          user={user}
          onSaved={(updated) => {
            setLocalUser((prev) => (prev ? { ...prev, ...updated } : prev))
            profileQuery.refetch()
          }}
        />
      )}

      {/* ===== Photo lightbox ===== */}
      <Dialog open={!!photoLightbox} onOpenChange={(o) => !o && setPhotoLightbox(null)}>
        <DialogContent
          className="max-w-4xl overflow-hidden border-none bg-black/90 p-0"
          showCloseButton
          aria-label="Pratinjau foto"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Pratinjau Foto</DialogTitle>
            <DialogDescription>
              Klik di luar foto atau tekan Escape untuk menutup.
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[90vh] min-h-[60vh] items-center justify-center">
            {photoLightbox && (
              <img
                src={photoLightbox}
                alt="Foto profil dalam ukuran penuh"
                className="max-h-[90vh] max-w-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Saved Posts Tab
// ============================================================
function SavedPostsTab() {
  const { toast } = useToast()
  const { openProfile } = useAppStore()
  const savedPostsQuery = useSavedPosts()
  const unsavePostMutation = useUnsavePost()

  const handleUnsave = (postId: string) => {
    unsavePostMutation.mutate(postId, {
      onSuccess: () => {
        toast({ title: "Dihapus dari simpanan" })
      },
      onError: () => {
        toast({ title: "Gagal", variant: "destructive" })
      },
    })
  }

  if (savedPostsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card animate-pulse rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="bg-muted size-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="bg-muted h-3 w-24 rounded" />
                <div className="bg-muted h-2 w-16 rounded" />
              </div>
            </div>
            <div className="bg-muted mb-1 h-3 w-full rounded" />
            <div className="bg-muted h-3 w-2/3 rounded" />
          </div>
        ))}
      </div>
    )
  }

  if (savedPostsQuery.error) {
    return (
      <EmptyState
        icon={<Bookmark className="size-10" />}
        title="Gagal memuat simpanan"
        description="Terjadi kesalahan saat memuat postingan tersimpan."
      />
    )
  }

  const posts = savedPostsQuery.data ?? []

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="size-10" />}
        title="Belum ada postingan tersimpan"
        description="Postingan yang Anda simpan akan muncul di sini."
      />
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-card rounded-xl border p-4 transition-shadow hover:shadow-sm"
        >
          <div className="mb-2 flex items-center gap-2">
            <button onClick={() => openProfile(post.author.id)}>
              <img
                src={
                  post.author.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${post.author.name}`
                }
                alt={post.author.name}
                className="size-8 rounded-full object-cover"
              />
            </button>
            <div className="min-w-0 flex-1">
              <button
                onClick={() => openProfile(post.author.id)}
                className="block truncate text-sm font-semibold hover:underline"
              >
                {post.author.name}
              </button>
              <span className="text-muted-foreground text-xs">@{post.author.username}</span>
            </div>
            <button
              onClick={() => handleUnsave(post.id)}
              disabled={unsavePostMutation.isPending}
              className="hover:bg-accent text-muted-foreground flex size-8 items-center justify-center rounded-full"
              aria-label="Hapus dari simpanan"
              title="Hapus dari simpanan"
            >
              <Bookmark className="text-primary size-4 fill-current" />
            </button>
          </div>
          <p className="mb-2 line-clamp-3 text-sm break-words whitespace-pre-wrap">
            {post.content || "(tanpa teks)"}
          </p>
          {post.images?.length > 0 && (
            <div className="mb-2 grid grid-cols-2 gap-1">
              {post.images.slice(0, 4).map((img: string, i: number) => (
                <img
                  key={i}
                  src={img}
                  alt=""
                  className="aspect-square w-full rounded-md object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}
          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span>{post._count?.likes || 0} suka</span>
            <span>{post._count?.comments || 0} komentar</span>
            <span className="ml-auto">
              Disimpan{" "}
              {(post as any).savedAt
                ? new Date((post as any).savedAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })
                : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Subcomponents
// ============================================================

function ProfileSkeleton() {
  return (
    <div className="min-h-screen">
      <Skeleton className="h-44 w-full rounded-none sm:h-52" />
      <div className="-mt-16 px-4 sm:px-6">
        <div className="flex items-end justify-between">
          <Skeleton className="ring-background size-24 rounded-full ring-4" />
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
      <div className="mt-4 px-4 sm:px-6">
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
    <EmptyState
      icon={<Grid3x3 className="size-10" />}
      title={isOwn ? "Anda belum memposting apapun" : "Belum ada postingan"}
      description={
        isOwn
          ? "Bagikan momen pertama Anda untuk mulai terhubung dengan teman."
          : "Pengguna ini belum membagikan apapun."
      }
      action={
        isOwn ? (
          <Button onClick={() => setView("feed")}>
            <Pencil className="size-4" />
            Buat Postingan
          </Button>
        ) : undefined
      }
    />
  )
}

function PrivateProfileNotice() {
  return (
    <EmptyState
      icon={<Lock className="size-10" />}
      title="Akun Privat"
      description="Untuk melihat postingan pengguna ini, kirim permintaan teman dan tunggu hingga disetujui."
    />
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

function EditProfileDialog({ open, onOpenChange, user, onSaved }: EditProfileDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState(user.name)
  const [bio, setBio] = useState(user.bio || "")
  const [location, setLocation] = useState(user.location || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [birthDate, setBirthDate] = useState(user.birthDate ? user.birthDate.slice(0, 10) : "")
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
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profil</DialogTitle>
          <DialogDescription>Perbarui informasi profil dan foto Anda.</DialogDescription>
        </DialogHeader>

        {/* Cover preview */}
        <div className="space-y-2">
          <Label>Foto Sampul</Label>
          <div className="bg-muted relative h-28 overflow-hidden rounded-xl">
            {coverUrl ? (
              <OptimizedImage src={coverUrl} alt="Cover" fill className="object-cover" />
            ) : (
              <div className={cn("h-full w-full bg-gradient-to-br", getCoverGradient(user.id))} />
            )}
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90"
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
              <UserAvatar src={avatarUrl} name={name} seed={user.id} size="xl" />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full shadow-md transition-colors"
                aria-label="Ubah avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
            </div>
            <div className="text-muted-foreground text-xs">
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
          <div className="text-muted-foreground text-right text-xs">{bio.length}/200</div>
        </div>

        {/* Location + Phone */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-start gap-2.5">
            {isPrivate ? (
              <Lock className="text-primary mt-0.5 size-4" />
            ) : (
              <Globe className="text-primary mt-0.5 size-4" />
            )}
            <div>
              <div className="text-sm font-medium">Akun Privat</div>
              <div className="text-muted-foreground text-xs">
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
