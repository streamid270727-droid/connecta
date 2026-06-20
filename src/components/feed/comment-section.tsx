"use client"

import { useState } from "react"
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
import {
  useComments,
  useCreateComment,
  useCreateReply,
  useToggleCommentLike,
  useEditComment,
  useDeleteComment,
} from "@/hooks/api/use-comments"

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
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")

  const { data: comments = [], isLoading } = useComments(postId)
  const createComment = useCreateComment(postId)
  const createReply = useCreateReply(postId)
  const toggleLike = useToggleCommentLike(postId)
  const editComment = useEditComment(postId)
  const deleteComment = useDeleteComment(postId)

  const submitComment = async () => {
    if (!newComment.trim() || createComment.isPending) return
    try {
      await createComment.mutateAsync(newComment.trim())
      setNewComment("")
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const submitReply = async (parentId: string) => {
    if (!replyText.trim() || createReply.isPending) return
    try {
      await createReply.mutateAsync({ parentId, content: replyText.trim() })
      setReplyText("")
      setReplyTo(null)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
    }
  }

  const handleToggleLike = (commentId: string) => {
    toggleLike.mutate(commentId)
  }

  const handleEdit = async (commentId: string, newContent: string): Promise<boolean> => {
    try {
      await editComment.mutateAsync({ commentId, content: newContent })
      return true
    } catch (e: any) {
      toast({ title: "Gagal", description: e.message, variant: "destructive" })
      return false
    }
  }

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId)
      toast({ title: "Komentar dihapus" })
    } catch {
      toast({ title: "Gagal menghapus komentar", variant: "destructive" })
    }
  }

  return (
    <div className="bg-muted/20 space-y-3 border-t p-3 sm:p-4">
      {/* New comment input */}
      <div className="flex gap-2">
        <UserAvatar
          src={session?.user?.image ?? null}
          name={session?.user?.name ?? null}
          seed={session?.user?.id}
          size="sm"
        />
        <div className="flex flex-1 gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Tulis komentar..."
            className="max-h-32 min-h-10 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                submitComment()
              }
            }}
          />
          <Button
            size="icon"
            onClick={submitComment}
            disabled={!newComment.trim() || createComment.isPending}
            className="shrink-0"
            aria-label="Kirim komentar"
          >
            {createComment.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-2">
              <div className="bg-muted size-8 animate-pulse rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="bg-muted h-2.5 w-1/3 animate-pulse rounded" />
                <div className="bg-muted h-2 w-1/2 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-muted-foreground py-4 text-center text-xs">
          <MessageCircle className="mx-auto mb-1 size-5 opacity-40" />
          Belum ada komentar. Jadilah yang pertama!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentItem
                comment={comment}
                onLike={() => handleToggleLike(comment.id)}
                onReply={() => {
                  setReplyTo(replyTo === comment.id ? null : comment.id)
                  setReplyText("")
                }}
                onEdit={(content) => handleEdit(comment.id, content)}
                onDelete={() => handleDelete(comment.id)}
                isReplying={replyTo === comment.id}
              />
              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-2 pl-10">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="relative">
                      <CornerDownRight className="text-muted-foreground absolute top-2 -left-5 size-3" />
                      <CommentItem
                        comment={reply}
                        onLike={() => handleToggleLike(reply.id)}
                        onEdit={(content) => handleEdit(reply.id, content)}
                        onDelete={() => handleDelete(reply.id)}
                        isReply={false}
                      />
                    </div>
                  ))}
                </div>
              )}
              {/* Reply input */}
              {replyTo === comment.id && (
                <div className="flex gap-2 pl-10">
                  <UserAvatar
                    src={session?.user?.image ?? null}
                    name={session?.user?.name ?? null}
                    seed={session?.user?.id}
                    size="sm"
                  />
                  <div className="flex flex-1 gap-2">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Balas ke ${comment.author.name}...`}
                      className="max-h-24 min-h-9 resize-none text-sm"
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
                      disabled={!replyText.trim() || createReply.isPending}
                      className="size-8 shrink-0"
                      aria-label="Kirim balasan"
                    >
                      {createReply.isPending ? (
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

  const handleDelete = () => {
    onDelete?.()
    setConfirmDelete(false)
  }

  return (
    <>
      <div className="group flex gap-2">
        <button
          onClick={() => openProfile(comment.author.id)}
          aria-label={`Lihat profil ${comment.author.name}`}
        >
          <UserAvatar
            src={comment.author.avatarUrl}
            name={comment.author.name}
            seed={comment.author.id}
            size="sm"
          />
        </button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-1.5">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="max-h-32 min-h-10 resize-none text-sm"
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
                  {saving ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-muted/60 inline-block rounded-2xl px-3 py-2">
              <button
                onClick={() => openProfile(comment.author.id)}
                className="flex items-center gap-1 hover:underline"
              >
                <span className="text-xs font-semibold">{comment.author.name}</span>
                {comment.author.isVerified && (
                  <CheckCircle2 className="fill-primary text-primary-foreground size-3" />
                )}
              </button>
              <p className="text-sm break-words whitespace-pre-wrap">{comment.content}</p>
            </div>
          )}
          {!editing && (
            <div className="mt-0.5 ml-1 flex items-center gap-3">
              <span className="text-muted-foreground text-[11px]">
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.likeCount > 0 && (
                <span className="text-muted-foreground flex items-center gap-0.5 text-[11px]">
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
                    <button
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Opsi komentar"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setEditing(true)}>
                      <Pencil className="mr-2 size-3.5" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setConfirmDelete(true)}
                    >
                      <Trash2 className="mr-2 size-3.5" />
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
          className="self-start p-1 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={comment.liked ? "Unlike komentar" : "Like komentar"}
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
