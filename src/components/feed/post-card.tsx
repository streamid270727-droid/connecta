"use client"

import { useState, useEffect, useRef } from "react"
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Bookmark,
  Send,
  Loader2,
  Link2,
  Globe,
  CheckCircle2,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { UserAvatar } from "@/components/common/user-avatar"
import { CommentSection } from "@/components/feed/comment-section"
import { useAppStore } from "@/lib/store"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime, formatNumber, getYouTubeId, getVimeoId } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

export interface FeedPost {
  id: string
  content: string
  images: string[]
  videoUrl: string | null
  createdAt: string
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    isVerified: boolean
  }
  liked: boolean
  shared: boolean
  _count: { likes: number; comments: number; shares: number }
  sharedFrom?: {
    id: string
    content: string
    images: string[]
    videoUrl: string | null
    createdAt: string
    author: { id: string; name: string; username: string; avatarUrl: string | null; isVerified: boolean }
  } | null
}

interface PostCardProps {
  post: FeedPost
  onUpdate: (id: string, updates: Partial<FeedPost>) => void
  onDelete: (id: string) => void
}

export function PostCard({ post, onUpdate, onDelete }: PostCardProps) {
  const { data: session } = useSession()
  const { openProfile } = useAppStore()
  const { toast } = useToast()
  const [showComments, setShowComments] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [imageViewer, setImageViewer] = useState<string | null>(null)

  const isOwn = session?.user?.id === post.author.id
  const ytId = post.videoUrl ? getYouTubeId(post.videoUrl) : null
  const vimeoId = post.videoUrl && !ytId ? getVimeoId(post.videoUrl) : null

  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)
    const wasLiked = post.liked
    // Optimistic update
    onUpdate(post.id, {
      liked: !wasLiked,
      _count: {
        ...post._count,
        likes: post._count.likes + (wasLiked ? -1 : 1),
      },
    })
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate(post.id, {
        liked: data.liked,
        _count: { ...post._count, likes: data.count },
      })
    } catch {
      // Revert
      onUpdate(post.id, {
        liked: wasLiked,
        _count: {
          ...post._count,
          likes: post._count.likes + (wasLiked ? 1 : -1),
        },
      })
      toast({ title: "Gagal", description: "Tidak dapat menyukai postingan", variant: "destructive" })
    } finally {
      setLikeLoading(false)
    }
  }

  const handleShare = async () => {
    if (shareLoading) return
    setShareLoading(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/share`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Gagal", description: data.error || "Gagal membagikan", variant: "destructive" })
      } else {
        toast({ title: "Dibagikan!", description: "Postingan telah dibagikan ke feed Anda" })
        onUpdate(post.id, {
          shared: true,
          _count: { ...post._count, shares: post._count.shares + 1 },
        })
        setShareDialogOpen(false)
      }
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setShareLoading(false)
    }
  }

  const handleDelete = async () => {
    if (deleteLoading) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Dihapus", description: "Postingan telah dihapus" })
        onDelete(post.id)
      }
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setDeleteLoading(false)
    }
  }

  const toggleComments = () => setShowComments((v) => !v)

  return (
    <>
      <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <button onClick={() => openProfile(post.author.id)}>
            <UserAvatar
              src={post.author.avatarUrl}
              name={post.author.name}
              seed={post.author.id}
              size="md"
            />
          </button>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => openProfile(post.author.id)}
              className="flex items-center gap-1 hover:underline"
            >
              <span className="font-semibold text-sm truncate">{post.author.name}</span>
              {post.author.isVerified && (
                <CheckCircle2 className="size-3.5 fill-primary text-primary-foreground" />
              )}
            </button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
              <Globe className="size-3" />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                <Share2 className="size-4" />
                Bagikan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImageViewer(post.id)}>
                <Bookmark className="size-4" />
                Simpan
              </DropdownMenuItem>
              {isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Hapus
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-3 sm:px-4 pb-3">
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {renderContentWithLinks(post.content)}
            </p>
          </div>
        )}

        {/* Shared post (embedded) */}
        {post.sharedFrom && (
          <div className="mx-3 sm:mx-4 mb-3 rounded-xl border bg-muted/30 overflow-hidden">
            <div className="flex items-center gap-2 p-3 pb-2">
              <UserAvatar
                src={post.sharedFrom.author.avatarUrl}
                name={post.sharedFrom.author.name}
                seed={post.sharedFrom.author.id}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs truncate">
                    {post.sharedFrom.author.name}
                  </span>
                  {post.sharedFrom.author.isVerified && (
                    <CheckCircle2 className="size-3 fill-primary text-primary-foreground" />
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  @{post.sharedFrom.author.username} · {formatRelativeTime(post.sharedFrom.createdAt)}
                </span>
              </div>
            </div>
            {post.sharedFrom.content && (
              <p className="text-sm px-3 pb-2 whitespace-pre-wrap break-words">
                {post.sharedFrom.content}
              </p>
            )}
            {post.sharedFrom.images?.length > 0 && (
              <PostImages images={post.sharedFrom.images} onOpen={setImageViewer} />
            )}
            {post.sharedFrom.videoUrl && (
              <VideoEmbed url={post.sharedFrom.videoUrl} />
            )}
          </div>
        )}

        {/* Images */}
        {post.images.length > 0 && (
          <PostImages images={post.images} onOpen={setImageViewer} />
        )}

        {/* Video */}
        {post.videoUrl && (ytId || vimeoId) && (
          <VideoEmbed url={post.videoUrl} ytId={ytId} vimeoId={vimeoId} />
        )}

        {/* Link preview (if videoUrl is a non-embeddable link) */}
        {post.videoUrl && !ytId && !vimeoId && (
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mx-3 sm:mx-4 mb-3 flex items-center gap-2 p-3 rounded-xl border bg-muted/30 hover:bg-muted/60 transition-colors"
          >
            <Link2 className="size-4 text-primary" />
            <span className="text-sm text-primary truncate">{post.videoUrl}</span>
          </a>
        )}

        {/* Counts summary */}
        {(post._count.likes > 0 || post._count.comments > 0 || post._count.shares > 0) && (
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              {post._count.likes > 0 && (
                <span className="flex items-center gap-1">
                  <span className="flex -space-x-1">
                    <span className="size-4 rounded-full bg-rose-500 flex items-center justify-center ring-1 ring-background">
                      <Heart className="size-2.5 fill-white text-white" />
                    </span>
                  </span>
                  {formatNumber(post._count.likes)}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {post._count.comments > 0 && (
                <span>{formatNumber(post._count.comments)} komentar</span>
              )}
              {post._count.shares > 0 && (
                <span>{formatNumber(post._count.shares)} bagikan</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center border-t">
          <ActionButton
            onClick={handleLike}
            active={post.liked}
            loading={likeLoading}
            icon={<Heart className={cn("size-4", post.liked && "fill-current")} />}
            label="Suka"
          />
          <ActionButton
            onClick={toggleComments}
            icon={<MessageCircle className="size-4" />}
            label="Komentar"
          />
          <ActionButton
            onClick={() => setShareDialogOpen(true)}
            icon={<Share2 className="size-4" />}
            label="Bagikan"
          />
        </div>

        {/* Comments */}
        {showComments && (
          <CommentSection postId={post.id} commentCount={post._count.comments} />
        )}
      </Card>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bagikan Postingan</DialogTitle>
            <DialogDescription>
              Postingan akan dibagikan ke feed Anda. Pengikut Anda akan melihatnya.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border bg-muted/30 p-3 max-h-40 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <UserAvatar
                src={post.author.avatarUrl}
                name={post.author.name}
                seed={post.author.id}
                size="sm"
              />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{post.author.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  @{post.author.username}
                </div>
              </div>
            </div>
            <p className="text-sm line-clamp-3 text-muted-foreground">
              {post.content || "(tanpa teks)"}
            </p>
          </div>
          <Button onClick={handleShare} disabled={shareLoading || post.shared}>
            {shareLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Membagikan...
              </>
            ) : post.shared ? (
              "Sudah dibagikan"
            ) : (
              <>
                <Send className="size-4" />
                Bagikan Sekarang
              </>
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Image viewer */}
      {imageViewer && (
        <Dialog open={!!imageViewer} onOpenChange={(o) => !o && setImageViewer(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none">
            <div className="flex items-center justify-center min-h-[60vh] max-h-[90vh]">
              <img
                src={imageViewer}
                alt=""
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function ActionButton({
  onClick,
  icon,
  label,
  active,
  loading,
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  active?: boolean
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function PostImages({
  images,
  onOpen,
}: {
  images: string[]
  onOpen: (url: string) => void
}) {
  if (images.length === 0) return null
  if (images.length === 1) {
    return (
      <button
        onClick={() => onOpen(images[0])}
        className="block w-full bg-muted"
      >
        <img
          src={images[0]}
          alt=""
          className="w-full max-h-[600px] object-cover"
        />
      </button>
    )
  }
  if (images.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-muted">
        {images.map((img, i) => (
          <button key={i} onClick={() => onOpen(img)} className="block aspect-square overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    )
  }
  if (images.length === 3) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-muted">
        <button onClick={() => onOpen(images[0])} className="block row-span-2 aspect-[1/2] overflow-hidden">
          <img src={images[0]} alt="" className="w-full h-full object-cover" />
        </button>
        <button onClick={() => onOpen(images[1])} className="block aspect-square overflow-hidden">
          <img src={images[1]} alt="" className="w-full h-full object-cover" />
        </button>
        <button onClick={() => onOpen(images[2])} className="block aspect-square overflow-hidden">
          <img src={images[2]} alt="" className="w-full h-full object-cover" />
        </button>
      </div>
    )
  }
  // 4 images
  return (
    <div className="grid grid-cols-2 gap-0.5 bg-muted">
      {images.slice(0, 4).map((img, i) => (
        <button key={i} onClick={() => onOpen(img)} className="block aspect-square overflow-hidden">
          <img src={img} alt="" className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  )
}

function VideoEmbed({
  url,
  ytId,
  vimeoId,
}: {
  url: string
  ytId?: string | null
  vimeoId?: string | null
}) {
  const [play, setPlay] = useState(false)

  if (ytId) {
    return (
      <div className="relative aspect-video bg-black">
        {play ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
            title="YouTube video"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlay(true)}
            className="group absolute inset-0 w-full h-full"
          >
            <img
              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="YouTube thumbnail"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="size-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="size-7 text-white fill-white ml-1" />
              </div>
            </div>
          </button>
        )}
      </div>
    )
  }

  if (vimeoId) {
    return (
      <div className="relative aspect-video bg-black">
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId}`}
          title="Vimeo video"
          className="w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return null
}

function renderContentWithLinks(content: string) {
  const parts = content.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline break-all"
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}
