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
  Pencil,
  X,
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
  emoji?: string | null
  shared: boolean
  saved?: boolean
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
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [shareLoading, setShareLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [imageViewer, setImageViewer] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const isOwn = session?.user?.id === post.author.id
  const ytId = post.videoUrl ? getYouTubeId(post.videoUrl) : null
  const vimeoId = post.videoUrl && !ytId ? getVimeoId(post.videoUrl) : null

  const handleLike = async (emoji?: string) => {
    if (likeLoading) return
    setLikeLoading(true)
    setShowReactionPicker(false)
    const wasLiked = post.liked
    const wasEmoji = (post as any).emoji || null
    // Optimistic update
    onUpdate(post.id, {
      liked: !wasLiked || !!(emoji && wasEmoji !== emoji),
      emoji: emoji || null,
      _count: {
        ...post._count,
        likes: wasLiked && (!emoji || wasEmoji === emoji)
          ? post._count.likes - 1
          : wasLiked ? post._count.likes : post._count.likes + 1,
      },
    })
    try {
      const body = emoji ? JSON.stringify({ emoji }) : undefined
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate(post.id, {
        liked: data.liked,
        emoji: data.emoji,
        _count: { ...post._count, likes: data.count },
      })
    } catch {
      // Revert
      onUpdate(post.id, {
        liked: wasLiked,
        emoji: wasEmoji,
        _count: {
          ...post._count,
          likes: wasLiked ? post._count.likes : post._count.likes - 1,
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

  const handleSave = async () => {
    if (saveLoading) return
    setSaveLoading(true)
    const wasSaved = !!post.saved
    onUpdate(post.id, { saved: !wasSaved })
    try {
      const res = await fetch(`/api/posts/${post.id}/save`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onUpdate(post.id, { saved: data.saved })
      toast({
        title: data.saved ? "Disimpan" : "Dihapus",
        description: data.saved
          ? "Postingan disimpan ke koleksi Anda"
          : "Postingan dihapus dari koleksi",
      })
    } catch {
      onUpdate(post.id, { saved: wasSaved })
      toast({ title: "Gagal", variant: "destructive" })
    } finally {
      setSaveLoading(false)
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
              <DropdownMenuItem onClick={handleSave} disabled={saveLoading}>
                {saveLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Bookmark className={cn("size-4", post.saved && "fill-current text-primary")} />
                )}
                {post.saved ? "Hapus dari Simpanan" : "Simpan"}
              </DropdownMenuItem>
              {isOwn && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                    <Pencil className="size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setConfirmDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
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
                  {(post as any).emoji ? (
                    <span className="text-sm leading-none">{(post as any).emoji}</span>
                  ) : (
                    <span className="size-4 rounded-full bg-rose-500 flex items-center justify-center">
                      <Heart className="size-2.5 fill-white text-white" />
                    </span>
                  )}
                  <span>{formatNumber(post._count.likes)}</span>
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
        <div className="flex items-center border-t px-2 sm:px-4">
          <div
            className="relative flex-1 flex"
            onMouseEnter={() => {
              if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
              setShowReactionPicker(true)
            }}
            onMouseLeave={() => {
              reactionTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 300)
            }}
          >
            <ActionButton
              onClick={() => handleLike()}
              active={post.liked}
              loading={likeLoading}
              icon={(post as any).emoji ? (
                <span className="text-base leading-none">{(post as any).emoji}</span>
              ) : (
                <Heart className={cn("size-4", post.liked && "fill-current")} />
              )}
              label={
                (post as any).emoji === "😂" ? "Hehe" :
                (post as any).emoji === "😮" ? "Wow" :
                (post as any).emoji === "😢" ? "Sedih" :
                (post as any).emoji === "👍" ? "Jempol" :
                "Suka"
              }
            />
            {showReactionPicker && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex items-center gap-0.5 bg-background border rounded-full px-2 py-1 shadow-lg z-50"
                onMouseEnter={() => {
                  if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current)
                }}
                onMouseLeave={() => {
                  reactionTimeoutRef.current = setTimeout(() => setShowReactionPicker(false), 200)
                }}
              >
                {["❤️", "😂", "😮", "😢", "👍"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLike(emoji)
                    }}
                    className="text-xl hover:scale-125 transition-transform px-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
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
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60 sm:hidden",
              post.saved ? "text-primary" : "text-muted-foreground"
            )}
            aria-label={post.saved ? "Hapus dari simpanan" : "Simpan"}
          >
            {saveLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bookmark className={cn("size-4", post.saved && "fill-current")} />
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className={cn(
              "hidden sm:flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60",
              post.saved ? "text-primary" : "text-muted-foreground"
            )}
            aria-label={post.saved ? "Hapus dari simpanan" : "Simpan"}
            title={post.saved ? "Hapus dari simpanan" : "Simpan"}
          >
            {saveLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Bookmark className={cn("size-4", post.saved && "fill-current")} />
            )}
          </button>
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
              Bagikan ke feed Anda atau ke platform lain.
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
          {/* Share to feed */}
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
                Bagikan ke Feed
              </>
            )}
          </Button>
          {/* External share */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Bagikan ke:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const text = encodeURIComponent(post.content || "Lihat postingan ini")
                  window.open(`https://wa.me/?text=${text}`, "_blank")
                }}
                className="size-9 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-600 flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </button>
              <button
                onClick={() => {
                  const text = encodeURIComponent(post.content || "Lihat postingan ini")
                  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
                }}
                className="size-9 rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast({ title: "Tersalin", description: "Link postingan disalin ke clipboard" })
                }}
                className="size-9 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground flex items-center justify-center transition-colors"
                aria-label="Salin link"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image viewer */}
      {imageViewer && (
        <Dialog open={!!imageViewer} onOpenChange={(o) => !o && setImageViewer(null)}>
          <DialogContent
            className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none"
            aria-label="Pratinjau gambar"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Pratinjau Gambar</DialogTitle>
              <DialogDescription>
                Klik di luar gambar atau tekan Escape untuk menutup.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-[60vh] max-h-[90vh]">
              <img
                src={imageViewer}
                alt="Gambar postingan dalam ukuran penuh"
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit post dialog */}
      <EditPostDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        post={post}
        onUpdated={(content) => {
          onUpdate(post.id, { content })
          setEditDialogOpen(false)
        }}
      />

      {/* Delete confirmation */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl border">
            <h3 className="text-lg font-semibold mb-2">Hapus Postingan?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Postingan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="size-4 animate-spin mr-2" />}
                Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function EditPostDialog({
  open,
  onOpenChange,
  post,
  onUpdated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  post: FeedPost
  onUpdated: (content: string) => void
}) {
  const { toast } = useToast()
  const [content, setContent] = useState(post.content)
  const [images, setImages] = useState<string[]>(post.images || [])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setContent(post.content)
      setImages(post.images || [])
    }
  }, [open, post.content, post.images])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length + files.length > 4) {
      toast({ title: "Maksimal 4 gambar", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) {
          toast({ title: `${file.name} terlalu besar (maks 4MB)`, variant: "destructive" })
          continue
        }
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) {
          toast({ title: "Gagal upload", variant: "destructive" })
          continue
        }
        const data = await res.json()
        uploaded.push(data.url)
      }
      setImages((prev) => [...prev, ...uploaded])
    } catch {
      toast({ title: "Gagal upload", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const submit = async () => {
    if (loading) return
    if (!content.trim()) {
      toast({ title: "Konten tidak boleh kosong", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), images }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Diperbarui", description: "Postingan telah diperbarui" })
        onUpdated(content.trim())
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Postingan</DialogTitle>
          <DialogDescription className="sr-only">
            Perbarui teks dan gambar postingan Anda.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-32 max-h-64 resize-none"
          maxLength={5000}
          autoFocus
        />

        {/* Image management */}
        <div className="space-y-2">
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-border/60">
                  <img src={img} alt="" className="w-full h-28 object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    type="button"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 4 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
              type="button"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {images.length === 0 ? "Tambah Gambar" : "Tambah Gambar Lain"} ({images.length}/4)
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">{content.length}/5000</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Batal
            </Button>
            <Button onClick={submit} disabled={loading || !content.trim()}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  // Split by URLs and @mentions
  const parts = content.split(/(https?:\/\/[^\s]+|@\w+)/g)
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
    if (/^@\w+$/.test(part)) {
      const username = part.slice(1)
      return (
        <a
          key={i}
          href={`/profile/${username}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}
