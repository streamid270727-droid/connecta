"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { X, ChevronLeft, ChevronRight, Eye, Trash2, Loader2, Pause, Play, Send } from "lucide-react"
import { UserAvatar } from "@/components/common/user-avatar"
import { formatRelativeTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface StoryData {
  id: string
  mediaUrl: string | null
  content: string | null
  bgColor: string | null
  textColor: string | null
  createdAt: string
  expiresAt: string
  viewed: boolean
  viewCount: number
}

interface StoryGroup {
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    isVerified: boolean
  }
  stories: StoryData[]
  hasUnviewed: boolean
}

interface StoryViewerProps {
  groups: StoryGroup[]
  initialGroupIdx: number
  onClose: () => void
}

const STORY_DURATION = 5000 // 5 seconds per story

export function StoryViewer({ groups, initialGroupIdx, onClose }: StoryViewerProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [groupIdx, setGroupIdx] = useState(initialGroupIdx)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [views, setViews] = useState<number | null>(null)
  const [reactionCount, setReactionCount] = useState<number | null>(null)
  const [myReaction, setMyReaction] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const viewedRef = useRef<Set<string>>(new Set())
  const touchStartY = useRef<number>(0)

  // Lock body scroll while viewer is open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const currentGroup = groups[groupIdx]
  const currentStory = currentGroup?.stories[storyIdx]
  const isOwn = currentGroup?.author.id === session?.user?.id

  // Mark story as viewed (once)
  const markViewed = useCallback(
    async (storyId: string) => {
      if (viewedRef.current.has(storyId)) return
      viewedRef.current.add(storyId)
      try {
        const res = await fetch(`/api/stories/${storyId}/view`, { method: "POST" })
        if (res.ok) {
          const data = await res.json()
          if (isOwn) setViews(data.viewCount)
        }
      } catch (e) {
        console.error("Failed to track story view:", e)
      }
    },
    [isOwn]
  )

  const handleReaction = useCallback(
    async (emoji: string) => {
      if (!currentStory || isOwn) return
      const prev = myReaction
      const prevCount = reactionCount
      setMyReaction(prev === emoji ? null : emoji)
      if (prev === emoji) {
        setReactionCount((c) => (c !== null ? Math.max(0, c - 1) : null))
      } else if (!prev) {
        setReactionCount((c) => (c !== null ? c + 1 : 1))
      }
      try {
        const res = await fetch(`/api/stories/${currentStory.id}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        })
        if (res.ok) {
          const data = await res.json()
          setMyReaction(data.action === "removed" ? null : data.emoji)
        } else {
          setMyReaction(prev)
          setReactionCount(prevCount)
        }
      } catch {
        setMyReaction(prev)
        setReactionCount(prevCount)
      }
    },
    [currentStory, isOwn, myReaction, reactionCount]
  )

  const handleSendReply = useCallback(async () => {
    if (!currentStory || !replyText.trim() || sendingReply) return
    setSendingReply(true)
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      })
      if (res.ok) {
        setReplyText("")
        toast({ title: "Terkirim", description: "Balasan story terkirim" })
      }
    } catch (e) {
      console.error("Failed to send story reply:", e)
    }
    setSendingReply(false)
  }, [currentStory, replyText, sendingReply, toast])

  // Reset reaction on story change
  useEffect(() => {
    setMyReaction(null)
    setReactionCount(null)
    setReplyText("")
  }, [groupIdx, storyIdx])

  const goNext = useCallback(() => {
    if (!currentGroup) return
    if (storyIdx < currentGroup.stories.length - 1) {
      setStoryIdx((i) => i + 1)
      setProgress(0)
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((i) => i + 1)
      setStoryIdx(0)
      setProgress(0)
    } else {
      onClose()
    }
  }, [currentGroup, storyIdx, groupIdx, groups.length, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
      setProgress(0)
    } else if (groupIdx > 0) {
      const prevGroup = groups[groupIdx - 1]
      setGroupIdx((i) => i - 1)
      setStoryIdx(prevGroup.stories.length - 1)
      setProgress(0)
    }
  }, [storyIdx, groupIdx, groups])

  // Load view count for own stories
  useEffect(() => {
    if (isOwn && currentStory) {
      setViews(currentStory.viewCount)
    } else {
      setViews(null)
    }
  }, [groupIdx, storyIdx, isOwn, currentStory])

  // Progress timer
  useEffect(() => {
    if (!currentStory || paused) return
    setProgress(0)
    void markViewed(currentStory.id)

    const startTime = Date.now()
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min((elapsed / STORY_DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        goNext()
      }
    }, 50)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [groupIdx, storyIdx, paused, markViewed, goNext])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      else if (e.key === "ArrowRight") goNext()
      else if (e.key === "ArrowLeft") goPrev()
      else if (e.key === " ") {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [goNext, goPrev, onClose])

  const handleDelete = async () => {
    if (!currentStory || !isOwn || deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/stories/${currentStory.id}`, { method: "DELETE" })
      if (!res.ok) {
        toast({ title: "Gagal menghapus", variant: "destructive" })
      } else {
        toast({ title: "Story dihapus" })
        onClose()
      }
    } catch {
      toast({ title: "Gagal", variant: "destructive" })
    } finally {
      setDeleting(false)
    }
  }

  if (!currentGroup || !currentStory) {
    onClose()
    return null
  }

  return (
    <div className="animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/95 duration-200">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="Tutup"
      >
        <X className="size-5" />
      </button>

      {/* Navigation: prev (left 30%) */}
      <button
        onClick={goPrev}
        disabled={groupIdx === 0 && storyIdx === 0}
        className="group absolute top-0 bottom-0 left-0 z-20 w-1/3 disabled:cursor-default"
        aria-label="Story sebelumnya"
      >
        <ChevronLeft
          className={cn(
            "absolute top-1/2 left-4 size-8 -translate-y-1/2 text-white/60 opacity-0 transition-opacity group-hover:opacity-100",
            groupIdx === 0 && storyIdx === 0 && "hidden"
          )}
        />
      </button>

      {/* Navigation: next (right 30%) */}
      <button
        onClick={goNext}
        className="group absolute top-0 right-0 bottom-0 z-20 w-1/3"
        aria-label="Story berikutnya"
      >
        <ChevronRight className="absolute top-1/2 right-4 size-8 -translate-y-1/2 text-white/60 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>

      {/* Pause overlay (center) */}
      <button
        onClick={() => setPaused((p) => !p)}
        className="absolute top-0 right-1/3 bottom-0 left-1/3 z-20 flex items-center justify-center"
        aria-label={paused ? "Lanjutkan" : "Jeda"}
      >
        {paused && (
          <div className="flex size-16 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
            <Play className="ml-1 size-7 fill-white text-white" />
          </div>
        )}
      </button>

      {/* Story container */}
      <div
        className="relative h-full w-full overflow-hidden bg-black sm:h-[90vh] sm:w-[420px] sm:rounded-2xl"
        onClick={() => setPaused((p) => !p)}
        onTouchStart={(e) => {
          touchStartY.current = e.touches[0].clientY
        }}
        onTouchEnd={(e) => {
          const deltaY = e.changedTouches[0].clientY - touchStartY.current
          if (deltaY > 80) onClose()
        }}
      >
        {/* Progress bars */}
        <div className="absolute top-0 right-0 left-0 z-30 flex gap-1 p-3">
          {currentGroup.stories.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author info */}
        <div className="absolute top-6 right-0 left-0 z-30 flex items-center gap-2 px-4 pt-2">
          <UserAvatar
            src={currentGroup.author.avatarUrl}
            name={currentGroup.author.name}
            seed={currentGroup.author.id}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-semibold text-white">
                {currentGroup.author.name}
              </span>
              {currentGroup.author.isVerified && (
                <svg className="size-3.5 fill-sky-400 text-sky-400" viewBox="0 0 24 24">
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              )}
            </div>
            <span className="text-xs text-white/70">
              {formatRelativeTime(currentStory.createdAt)}
            </span>
          </div>
          {isOwn ? (
            <>
              <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-white">
                <Eye className="size-3" />
                {views ?? currentStory.viewCount}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete()
                }}
                disabled={deleting}
                className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-red-500/80"
                aria-label="Hapus story"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </>
          ) : null}
          {paused && (
            <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white">
              <Pause className="size-4" />
            </div>
          )}
        </div>

        {/* Story content */}
        {currentStory.mediaUrl ? (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="h-full w-full object-cover"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br p-8",
              currentStory.bgColor || "from-rose-500 to-pink-600"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-center text-2xl leading-snug font-bold break-words whitespace-pre-wrap sm:text-3xl"
              style={{ color: currentStory.textColor || "#ffffff" }}
            >
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Caption overlay (if media + content) */}
        {currentStory.mediaUrl && currentStory.content && (
          <div className="absolute right-0 bottom-16 left-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-sm break-words whitespace-pre-wrap text-white">
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Reaction bar + Reply input (non-own stories) */}
        {!isOwn && (
          <div className="absolute right-0 bottom-0 left-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
            {/* Emoji reactions */}
            <div className="mb-2 flex items-center justify-center gap-2">
              {["❤️", "😂", "😮", "😢", "👍"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReaction(emoji)
                  }}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full text-xl transition-all",
                    myReaction === emoji
                      ? "scale-125 bg-white/30"
                      : "bg-white/10 hover:scale-110 hover:bg-white/20"
                  )}
                  aria-label={`Reaksi ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {reactionCount !== null && reactionCount > 0 && (
              <p className="mb-1 text-center text-xs text-white/60">{reactionCount} reaksi</p>
            )}
            {/* Reply input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="Balas story..."
                className="h-10 flex-1 rounded-full bg-white/15 px-4 text-sm text-white placeholder-white/50 transition-colors outline-none focus:bg-white/25"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSendReply()
                }}
                disabled={!replyText.trim() || sendingReply}
                className="flex size-10 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 disabled:opacity-40"
              >
                {sendingReply ? (
                  <Loader2 className="size-4 animate-spin text-white" />
                ) : (
                  <Send className="size-4 text-white" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Group indicator dots */}
        {groups.length > 1 && (
          <div
            className={cn(
              "absolute left-1/2 z-30 flex -translate-x-1/2 gap-1.5",
              isOwn ? "bottom-4" : "bottom-[104px]"
            )}
          >
            {groups.map((g, i) => (
              <div
                key={g.author.id}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === groupIdx ? "w-6 bg-white" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
