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
  Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
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
import { UserAvatar } from "@/components/common/user-avatar"
import { OptimizedImage } from "@/components/common/optimized-image"
import { CommentSection } from "@/components/feed/comment-section"
import { useAppStore } from "@/lib/store"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime, formatNumber, getYouTubeId, getVimeoId } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface FeedPost {
  id: string
  content: string
  images: string[]
  videoUrl: string | null
  linkPreview?: {
    title: string
    description: string
    image: string | null
    url: string
    siteName: string | null
  } | null
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
  reactionSummary?: { emoji: string; count: number }[]
  shared: boolean
  saved?: boolean
  _count: { likes: number; comments: number; shares: number }
  sharedFrom?: {
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
    const wasSummary = post.reactionSummary || []

    // Compute optimistic reactionSummary
    let newSummary = [...wasSummary]
    if (wasLiked && (!emoji || wasEmoji === emoji)) {
      // Removing reaction
      if (wasEmoji) {
        const idx = newSummary.findIndex((r) => r.emoji === wasEmoji)
        if (idx !== -1) {
          if (newSummary[idx].count <= 1) newSummary.splice(idx, 1)
          else newSummary[idx] = { ...newSummary[idx], count: newSummary[idx].count - 1 }
        }
      }
    } else if (wasLiked && emoji && wasEmoji !== emoji) {
      // Changing reaction
      if (wasEmoji) {
        const idx = newSummary.findIndex((r) => r.emoji === wasEmoji)
        if (idx !== -1) {
          if (newSummary[idx].count <= 1) newSummary.splice(idx, 1)
          else newSummary[idx] = { ...newSummary[idx], count: newSummary[idx].count - 1 }
        }
      }
      if (emoji) {
        const idx = newSummary.findIndex((r) => r.emoji === emoji)
        if (idx !== -1) newSummary[idx] = { ...newSummary[idx], count: newSummary[idx].count + 1 }
        else newSummary.push({ emoji, count: 1 })
      }
    } else {
      // Adding new reaction
      if (emoji) {
        const idx = newSummary.findIndex((r) => r.emoji === emoji)
        if (idx !== -1) newSummary[idx] = { ...newSummary[idx], count: newSummary[idx].count + 1 }
        else newSummary.push({ emoji, count: 1 })
      }
    }
    newSummary.sort((a, b) => b.count - a.count)

    // Optimistic update
    onUpdate(post.id, {
      liked: !wasLiked || !!(emoji && wasEmoji !== emoji),
      emoji: emoji || null,
      reactionSummary: newSummary,
      _count: {
        ...post._count,
        likes:
          wasLiked && (!emoji || wasEmoji === emoji)
            ? post._count.likes - 1
            : wasLiked
              ? post._count.likes
              : post._count.likes + 1,
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
        reactionSummary: data.reactionSummary,
        _count: { ...post._count, likes: data.count },
      })
    } catch {
      // Revert
      onUpdate(post.id, {
        liked: wasLiked,
        emoji: wasEmoji,
        reactionSummary: wasSummary,
        _count: {
          ...post._count,
          likes: wasLiked ? post._count.likes : post._count.likes - 1,
        },
      })
      toast({
        title: "Gagal",
        description: "Tidak dapat menyukai postingan",
        variant: "destructive",
      })
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
        toast({
          title: "Gagal",
          description: data.error || "Gagal membagikan",
          variant: "destructive",
        })
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

  const handleReport = async () => {
    const reason = prompt("Alasan melaporkan postingan ini:")
    if (!reason?.trim()) return
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: post.id, targetType: "post", reason: reason.trim() }),
      })
      if (res.ok) {
        toast({ title: "Terlaporkan", description: "Laporan Anda akan segera ditinjau" })
      } else {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    }
  }

  const toggleComments = () => setShowComments((v) => !v)

  return (
    <>
      <Card className="overflow-hidden border shadow-sm transition-shadow hover:shadow-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 sm:p-4">
          <button
            onClick={() => openProfile(post.author.id)}
            aria-label={`Lihat profil ${post.author.name}`}
          >
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
              <span className="truncate text-sm font-semibold">{post.author.name}</span>
              {post.author.isVerified && (
                <CheckCircle2 className="fill-primary text-primary-foreground size-3.5" />
              )}
            </button>
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{formatRelativeTime(post.createdAt)}</span>
              <Globe className="size-3" />
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Opsi lainnya">
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
                  <Bookmark className={cn("size-4", post.saved && "text-primary fill-current")} />
                )}
                {post.saved ? "Hapus dari Simpanan" : "Simpan"}
              </DropdownMenuItem>
              {!isOwn && (
                <DropdownMenuItem onClick={() => handleReport()}>
                  <Flag className="size-4" />
                  Laporkan
                </DropdownMenuItem>
              )}
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
          <div className="px-3 pb-3 sm:px-4">
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              <ContentWithLinks content={post.content} />
            </p>
          </div>
        )}

        {/* Shared post (embedded) */}
        {post.sharedFrom && (
          <div className="bg-muted/30 mx-3 mb-3 overflow-hidden rounded-xl border sm:mx-4">
            <div className="flex items-center gap-2 p-3 pb-2">
              <UserAvatar
                src={post.sharedFrom.author.avatarUrl}
                name={post.sharedFrom.author.name}
                seed={post.sharedFrom.author.id}
                size="sm"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="truncate text-xs font-semibold">
                    {post.sharedFrom.author.name}
                  </span>
                  {post.sharedFrom.author.isVerified && (
                    <CheckCircle2 className="fill-primary text-primary-foreground size-3" />
                  )}
                </div>
                <span className="text-muted-foreground text-[11px]">
                  @{post.sharedFrom.author.username} ·{" "}
                  {formatRelativeTime(post.sharedFrom.createdAt)}
                </span>
              </div>
            </div>
            {post.sharedFrom.content && (
              <p className="px-3 pb-2 text-sm break-words whitespace-pre-wrap">
                {post.sharedFrom.content}
              </p>
            )}
            {post.sharedFrom.images?.length > 0 && (
              <PostImages images={post.sharedFrom.images} onOpen={setImageViewer} />
            )}
            {post.sharedFrom.videoUrl && <VideoEmbed url={post.sharedFrom.videoUrl} />}
          </div>
        )}

        {/* Images */}
        {post.images.length > 0 && <PostImages images={post.images} onOpen={setImageViewer} />}

        {/* Video */}
        {post.videoUrl && (ytId || vimeoId) && (
          <VideoEmbed url={post.videoUrl} ytId={ytId} vimeoId={vimeoId} />
        )}

        {/* Link preview */}
        {post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}

        {/* Link preview (if videoUrl is a non-embeddable link) */}
        {post.videoUrl && !ytId && !vimeoId && (
          <a
            href={post.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-muted/30 hover:bg-muted/60 mx-3 mb-3 flex items-center gap-2 rounded-xl border p-3 transition-colors sm:mx-4"
          >
            <Link2 className="text-primary size-4" />
            <span className="text-primary truncate text-sm">{post.videoUrl}</span>
          </a>
        )}

        {/* Counts summary */}
        {(post._count.likes > 0 || post._count.comments > 0 || post._count.shares > 0) && (
          <div className="text-muted-foreground flex items-center justify-between px-3 py-2 text-xs sm:px-4">
            <div className="flex items-center gap-1">
              {post._count.likes > 0 && (
                <span className="flex items-center gap-1">
                  {post.reactionSummary && post.reactionSummary.length > 0 ? (
                    <span className="flex items-center gap-1">
                      {post.reactionSummary.map((r) => (
                        <span key={r.emoji} className="flex items-center gap-0.5">
                          <span className="text-sm leading-none">{r.emoji}</span>
                          <span>{r.count}</span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    <>
                      <span className="flex size-4 items-center justify-center rounded-full bg-rose-500">
                        <Heart className="size-2.5 fill-white text-white" />
                      </span>
                      <span>{formatNumber(post._count.likes)}</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              {post._count.comments > 0 && (
                <span>{formatNumber(post._count.comments)} komentar</span>
              )}
              {post._count.shares > 0 && <span>{formatNumber(post._count.shares)} bagikan</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center border-t px-2 sm:px-4">
          <div
            className="relative flex flex-1"
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
              icon={
                (post as any).emoji ? (
                  <span className="text-base leading-none">{(post as any).emoji}</span>
                ) : (
                  <Heart className={cn("size-4", post.liked && "fill-current")} />
                )
              }
              label={
                (post as any).emoji === "😂"
                  ? "Hehe"
                  : (post as any).emoji === "😮"
                    ? "Wow"
                    : (post as any).emoji === "😢"
                      ? "Sedih"
                      : (post as any).emoji === "👍"
                        ? "Jempol"
                        : "Suka"
              }
            />
            {showReactionPicker && (
              <div
                className="bg-background absolute bottom-full left-1/2 z-50 mb-1 flex -translate-x-1/2 items-center gap-0.5 rounded-full border px-2 py-1 shadow-lg"
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
                    className="px-0.5 text-xl transition-transform hover:scale-125"
                    aria-label={`Reaksi ${emoji}`}
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
              "hover:bg-muted/60 flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors sm:hidden",
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
              "hover:bg-muted/60 hidden flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors sm:flex",
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
        {showComments && <CommentSection postId={post.id} commentCount={post._count.comments} />}
      </Card>

      {/* Share dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bagikan Postingan</DialogTitle>
            <DialogDescription>Bagikan ke feed Anda atau ke platform lain.</DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 max-h-40 overflow-y-auto rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-2">
              <UserAvatar
                src={post.author.avatarUrl}
                name={post.author.name}
                seed={post.author.id}
                size="sm"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{post.author.name}</div>
                <div className="text-muted-foreground truncate text-[11px]">
                  @{post.author.username}
                </div>
              </div>
            </div>
            <p className="text-muted-foreground line-clamp-3 text-sm">
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
            <span className="text-muted-foreground text-xs">Bagikan ke:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const text = encodeURIComponent(post.content || "Lihat postingan ini")
                  window.open(`https://wa.me/?text=${text}`, "_blank")
                }}
                className="flex size-9 items-center justify-center rounded-full bg-green-500/10 text-green-600 transition-colors hover:bg-green-500/20 dark:text-green-400"
                aria-label="WhatsApp"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const text = encodeURIComponent(post.content || "Lihat postingan ini")
                  window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank")
                }}
                className="flex size-9 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 transition-colors hover:bg-sky-500/20 dark:text-sky-400"
                aria-label="Twitter"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  toast({ title: "Tersalin", description: "Link postingan disalin ke clipboard" })
                }}
                className="bg-muted hover:bg-muted/80 text-muted-foreground flex size-9 items-center justify-center rounded-full transition-colors"
                aria-label="Salin link"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image viewer */}
      {imageViewer && (
        <Dialog open={!!imageViewer} onOpenChange={(o) => !o && setImageViewer(null)}>
          <DialogContent
            className="max-w-4xl overflow-hidden border-none bg-black/90 p-0"
            aria-label="Pratinjau gambar"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Pratinjau Gambar</DialogTitle>
              <DialogDescription>
                Klik di luar gambar atau tekan Escape untuk menutup.
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[90vh] min-h-[60vh] items-center justify-center">
              <img
                src={imageViewer}
                alt="Gambar postingan dalam ukuran penuh"
                className="max-h-[90vh] max-w-full object-contain"
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
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Postingan?</DialogTitle>
            <DialogDescription>
              Postingan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          className="max-h-64 min-h-32 resize-none"
          maxLength={5000}
          autoFocus
        />

        {/* Image management */}
        <div className="space-y-2">
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="group border-border/60 relative aspect-square overflow-hidden rounded-lg border"
                >
                  <OptimizedImage src={img} alt="" fill className="object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    type="button"
                    aria-label="Hapus gambar"
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
              {uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
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

        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">{content.length}/5000</span>
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
        "hover:bg-muted/60 flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function PostImages({ images, onOpen }: { images: string[]; onOpen: (url: string) => void }) {
  if (images.length === 0) return null
  if (images.length === 1) {
    return (
      <button
        onClick={() => onOpen(images[0])}
        className="bg-muted relative block w-full overflow-hidden"
        style={{ height: "min(600px, 70vh)" }}
        aria-label="Lihat gambar"
      >
        <OptimizedImage src={images[0]} alt="" fill className="object-cover" />
      </button>
    )
  }
  if (images.length === 2) {
    return (
      <div className="bg-muted grid grid-cols-2 gap-0.5">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => onOpen(img)}
            className="relative block aspect-square overflow-hidden"
            aria-label="Lihat gambar"
          >
            <OptimizedImage src={img} alt="" fill className="object-cover" />
          </button>
        ))}
      </div>
    )
  }
  if (images.length === 3) {
    return (
      <div className="bg-muted grid grid-cols-2 gap-0.5">
        <button
          onClick={() => onOpen(images[0])}
          className="relative row-span-2 block aspect-[1/2] overflow-hidden"
          aria-label="Lihat gambar"
        >
          <OptimizedImage src={images[0]} alt="" fill className="object-cover" />
        </button>
        <button
          onClick={() => onOpen(images[1])}
          className="relative block aspect-square overflow-hidden"
          aria-label="Lihat gambar"
        >
          <OptimizedImage src={images[1]} alt="" fill className="object-cover" />
        </button>
        <button
          onClick={() => onOpen(images[2])}
          className="relative block aspect-square overflow-hidden"
          aria-label="Lihat gambar"
        >
          <OptimizedImage src={images[2]} alt="" fill className="object-cover" />
        </button>
      </div>
    )
  }
  // 4 images
  return (
    <div className="bg-muted grid grid-cols-2 gap-0.5">
      {images.slice(0, 4).map((img, i) => (
        <button
          key={i}
          onClick={() => onOpen(img)}
          className="relative block aspect-square overflow-hidden"
          aria-label="Lihat gambar"
        >
          <OptimizedImage src={img} alt="" fill className="object-cover" />
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
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button onClick={() => setPlay(true)} className="group absolute inset-0 h-full w-full">
            <img
              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="YouTube thumbnail"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/40">
              <div className="flex size-16 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
                <Play className="ml-1 size-7 fill-white text-white" />
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
          className="h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return null
}

function ContentWithLinks({ content }: { content: string }) {
  const { openProfile, setView, setSearchQuery } = useAppStore()
  // Split by URLs, @mentions, and #hashtags
  const parts = content.split(/(https?:\/\/[^\s]+|@\w+|#[\w]+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary break-all hover:underline"
            >
              {part}
            </a>
          )
        }
        if (/^@\w+$/.test(part)) {
          const username = part.slice(1)
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                openProfile(username)
              }}
              className="text-primary font-medium hover:underline"
            >
              {part}
            </button>
          )
        }
        if (/^#[\w]+$/.test(part)) {
          const tag = part.slice(1)
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                setSearchQuery(tag)
                setView("search")
              }}
              className="text-primary font-medium hover:underline"
            >
              {part}
            </button>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function LinkPreviewCard({
  preview,
}: {
  preview: {
    title: string
    description: string
    image: string | null
    url: string
    siteName: string | null
  }
}) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-muted/30 hover:bg-muted/60 mx-3 mb-3 block overflow-hidden rounded-xl border transition-colors sm:mx-4"
    >
      {preview.image && (
        <img
          src={preview.image}
          alt={preview.title}
          className="h-40 w-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = "none"
          }}
        />
      )}
      <div className="p-3">
        <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[11px]">
          <Link2 className="size-3" />
          <span>{preview.siteName || new URL(preview.url).hostname}</span>
        </div>
        <p className="line-clamp-2 text-sm font-medium">{preview.title}</p>
        {preview.description && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{preview.description}</p>
        )}
      </div>
    </a>
  )
}
