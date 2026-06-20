"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  MoreHorizontal,
  Trash2,
  Pencil,
  CornerDownRight,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/common/user-avatar"
import { useAppStore } from "@/lib/store"
import { useSession } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime, formatNumber } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Comment {
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
  liked: boolean
  likeCount: number
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
  commentCount: number
}

export function CommentSection({ postId, commentCount }: CommentSectionProps) {
  const { data: session } = useSession()
  const { openProfile } = useAppStore()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setComments(data.comments)
    } catch {
      toast({ title: "Gagal memuat komentar", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [postId, toast])

  useEffect(() => {
    void loadComments()
  }, [loadComments])

  const submitComment = async () => {
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        const data = await res.json()
        setComments((prev) => [...prev, { ...data.comment, replies: [] }])
        setNewComment("")
      }
    } catch {
      toast({ title: "Gagal", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const submitReply = async (parentId: string) => {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim(), parentId }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        const data = await res.json()
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies || []), data.comment] }
              : c
          )
        )
        setReplyText("")
        setReplyTo(null)
      }
    } catch {
      toast({ title: "Gagal", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleLike = async (commentId: string, isReply: boolean, parentId?: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" })
      if (!res.ok) return
      const data = await res.json()
      if (isReply && parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? {
                  ...c,
                  replies: (c.replies || []).map((r) =>
                    r.id === commentId
                      ? { ...r, liked: data.liked, likeCount: data.count }
                      : r
                  ),
                }
              : c
          )
        )
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? { ...c, liked: data.liked, likeCount: data.count }
              : c
          )
        )
      }
    } catch (e) {
      console.error("Failed to toggle comment like:", e)
    }
  }

  const editComment = async (commentId: string, newContent: string, isReply: boolean, parentId?: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
        return false
      }
      const data = await res.json()
      if (isReply && parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? {
                  ...c,
                  replies: (c.replies || []).map((r) =>
                    r.id === commentId ? { ...r, content: data.comment.content } : r
                  ),
                }
              : c
          )
        )
      } else {
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId ? { ...c, content: data.comment.content } : c
          )
        )
      }
      return true
    } catch {
      toast({ title: "Gagal", variant: "destructive" })
      return false
    }
  }

  const deleteComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: "DELETE" })
      if (!res.ok) {
        toast({ title: "Gagal menghapus komentar", variant: "destructive" })
        return
      }
      if (isReply && parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: (c.replies || []).filter((r) => r.id !== commentId) }
              : c
          )
        )
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentId))
      }
      toast({ title: "Komentar dihapus" })
    } catch {
      toast({ title: "Gagal", variant: "destructive" })
    }
  }

  return (
    <div className="border-t bg-muted/20 p-3 sm:p-4 space-y-3">
      {/* New comment input */}
      <div className="flex gap-2">
        <UserAvatar
          src={session?.user?.image ?? null}
          name={session?.user?.name ?? null}
          seed={session?.user?.id}
          size="sm"
        />
        <div className="flex-1 flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Tulis komentar..."
            className="min-h-10 max-h-32 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                submitComment()
              }
            }}
          />
          <Button
            size="icon"
            onClick={submitComment}
            disabled={!newComment.trim() || submitting}
            className="shrink-0"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="size-8 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-1/3 rounded bg-muted animate-pulse" />
                <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          <MessageCircle className="size-5 mx-auto mb-1 opacity-40" />
          Belum ada komentar. Jadilah yang pertama!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentItem
                comment={comment}
                onLike={() => toggleLike(comment.id, false)}
                onReply={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id)
                  setReplyText("")
                }}
                onEdit={(content) => editComment(comment.id, content, false)}
                onDelete={() => deleteComment(comment.id, false)}
                isReplying={replyTo === comment.id}
              />
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="pl-10 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="relative">
                      <CornerDownRight className="absolute -left-5 top-2 size-3 text-muted-foreground" />
                      <CommentItem
                        comment={reply}
                        onLike={() => toggleLike(reply.id, true, comment.id)}
                        onEdit={(content) => editComment(reply.id, content, true, comment.id)}
                        onDelete={() => deleteComment(reply.id, true, comment.id)}
                        isReply={false}
                      />
                    </div>
                  ))}
                </div>
              )}
              {/* Reply input */}
              {replyTo === comment.id && (
                <div className="pl-10 flex gap-2">
                  <UserAvatar
                    src={session?.user?.image ?? null}
                    name={session?.user?.name ?? null}
                    seed={session?.user?.id}
                    size="sm"
                  />
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Balas ke ${comment.author.name}...`}
                      className="min-h-9 max-h-24 resize-none text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          submitReply(comment.id)
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      onClick={() => submitReply(comment.id)}
                      disabled={!replyText.trim() || submitting}
                      className="shrink-0 size-8"
                    >
                      {submitting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Send className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  onLike,
  onReply,
  onEdit,
  onDelete,
  isReplying,
  isReply = true,
}: {
  comment: Comment
  onLike: () => void
  onReply?: () => void
  onEdit?: (content: string) => Promise<boolean | void>
  onDelete?: () => void
  isReplying?: boolean
  isReply?: boolean
}) {
  const { openProfile } = useAppStore()
  const { data: session } = useSession()
  const { toast } = useToast()
  const isOwn = session?.user?.id === comment.author.id
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSaveEdit = async () => {
    if (!editContent.trim() || saving) return
    setSaving(true)
    const ok = await onEdit?.(editContent.trim())
    setSaving(false)
    if (ok !== false) setEditing(false)
  }

  const handleDelete = async () => {
    onDelete?.()
    setConfirmDelete(false)
  }

  return (
    <>
      <div className="flex gap-2 group">
        <button onClick={() => openProfile(comment.author.id)}>
          <UserAvatar
            src={comment.author.avatarUrl}
            name={comment.author.name}
            seed={comment.author.id}
            size="sm"
          />
        </button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-1.5">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-10 max-h-32 resize-none text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit()
                  if (e.key === "Escape") {
                    setEditing(false)
                    setEditContent(comment.content)
                  }
                }}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setEditing(false)
                    setEditContent(comment.content)
                  }}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || saving}
                >
                  {saving ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted/60 px-3 py-2 inline-block">
              <button
                onClick={() => openProfile(comment.author.id)}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="font-semibold text-xs">{comment.author.name}</span>
                {comment.author.isVerified && (
                  <CheckCircle2 className="size-3 fill-primary text-primary-foreground" />
                )}
              </button>
              <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
            </div>
          )}
          {!editing && (
            <div className="flex items-center gap-3 mt-0.5 ml-1">
              <span className="text-[11px] text-muted-foreground">
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.likeCount > 0 && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <Heart className="size-2.5 fill-current" />
                  {formatNumber(comment.likeCount)}
                </span>
              )}
              <button
                onClick={onLike}
                className={cn(
                  "text-[11px] font-medium",
                  comment.liked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Suka
              </button>
              {onReply && (
                <button
                  onClick={onReply}
                  className={cn(
                    "text-[11px] font-medium",
                    isReplying ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Balas
                </button>
              )}
              {isOwn && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="size-3.5 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="size-3.5 mr-2" />
                      Hapus
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onLike}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 self-start"
        >
          <Heart
            className={cn(
              "size-3.5",
              comment.liked ? "fill-primary text-primary" : "text-muted-foreground"
            )}
          />
        </button>
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus komentar?</AlertDialogTitle>
            <AlertDialogDescription>
              Komentar akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
