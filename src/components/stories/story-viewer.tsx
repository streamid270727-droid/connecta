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
  const markViewed = useCallback(async (storyId: string) => {
    if (viewedRef.current.has(storyId)) return
    viewedRef.current.add(storyId)
    try {
      const res = await fetch(`/api/stories/${storyId}/view`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (isOwn) setViews(data.viewCount)
      }
    } catch {}
  }, [isOwn])

  const handleReaction = useCallback(async (emoji: string) => {
    if (!currentStory || isOwn) return
    const prev = myReaction
    const prevCount = reactionCount
    setMyReaction(prev === emoji ? null : emoji)
    if (prev === emoji) {
      setReactionCount((c) => c !== null ? Math.max(0, c - 1) : null)
    } else if (!prev) {
      setReactionCount((c) => c !== null ? c + 1 : 1)
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
  }, [currentStory, isOwn, myReaction, reactionCount])

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
    } catch {}
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
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-in fade-in duration-200">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 size-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
        aria-label="Tutup"
      >
        <X className="size-5" />
      </button>

      {/* Navigation: prev (left 30%) */}
      <button
        onClick={goPrev}
        disabled={groupIdx === 0 && storyIdx === 0}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-20 disabled:cursor-default group"
        aria-label="Story sebelumnya"
      >
        <ChevronLeft
          className={cn(
            "size-8 text-white/60 absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity",
            (groupIdx === 0 && storyIdx === 0) && "hidden"
          )}
        />
      </button>

      {/* Navigation: next (right 30%) */}
      <button
        onClick={goNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-20 group"
        aria-label="Story berikutnya"
      >
        <ChevronRight className="size-8 text-white/60 absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Pause overlay (center) */}
      <button
        onClick={() => setPaused((p) => !p)}
        className="absolute left-1/3 right-1/3 top-0 bottom-0 z-20 flex items-center justify-center"
        aria-label={paused ? "Lanjutkan" : "Jeda"}
      >
        {paused && (
          <div className="size-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="size-7 text-white fill-white ml-1" />
          </div>
        )}
      </button>

      {/* Story container */}
      <div
        className="relative w-full h-full sm:w-[420px] sm:h-[90vh] sm:rounded-2xl overflow-hidden bg-black"
        onClick={() => setPaused((p) => !p)}
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY }}
        onTouchEnd={(e) => {
          const deltaY = e.changedTouches[0].clientY - touchStartY.current
          if (deltaY > 80) onClose()
        }}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-3">
          {currentGroup.stories.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full bg-white/30 overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Author info */}
        <div className="absolute top-6 left-0 right-0 z-30 flex items-center gap-2 px-4 pt-2">
          <UserAvatar
            src={currentGroup.author.avatarUrl}
            name={currentGroup.author.name}
            seed={currentGroup.author.id}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-white truncate">
                {currentGroup.author.name}
              </span>
              {currentGroup.author.isVerified && (
                <svg className="size-3.5 fill-sky-400 text-sky-400" viewBox="0 0 24 24">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              )}
            </div>
            <span className="text-xs text-white/70">
              {formatRelativeTime(currentStory.createdAt)}
            </span>
          </div>
          {isOwn ? (
            <>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-white text-xs">
                <Eye className="size-3" />
                {views ?? currentStory.viewCount}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  void handleDelete()
                }}
                disabled={deleting}
                className="size-8 rounded-full bg-white/10 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors"
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
            <div className="size-8 rounded-full bg-white/10 text-white flex items-center justify-center">
              <Pause className="size-4" />
            </div>
          )}
        </div>

        {/* Story content */}
        {currentStory.mediaUrl ? (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="w-full h-full object-cover"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div
            className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center p-8",
              currentStory.bgColor || "from-rose-500 to-pink-600"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-center text-2xl sm:text-3xl font-bold whitespace-pre-wrap break-words leading-snug text-center"
              style={{ color: currentStory.textColor || "#ffffff" }}
            >
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Caption overlay (if media + content) */}
        {currentStory.mediaUrl && currentStory.content && (
          <div className="absolute bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <p className="text-white text-sm whitespace-pre-wrap break-words">
              {currentStory.content}
            </p>
          </div>
        )}

        {/* Reaction bar + Reply input (non-own stories) */}
        {!isOwn && (
          <div className="absolute bottom-0 left-0 right-0 z-30 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            {/* Emoji reactions */}
            <div className="flex items-center justify-center gap-2 mb-2">
              {["❤️", "😂", "😮", "😢", "👍"].map((emoji) => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReaction(emoji)
                  }}
                  className={cn(
                    "size-10 rounded-full flex items-center justify-center text-xl transition-all",
                    myReaction === emoji
                      ? "bg-white/30 scale-125"
                      : "bg-white/10 hover:bg-white/20 hover:scale-110"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {reactionCount !== null && reactionCount > 0 && (
              <p className="text-center text-xs text-white/60 mb-1">{reactionCount} reaksi</p>
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
                className="flex-1 h-10 px-4 rounded-full bg-white/15 text-white placeholder-white/50 text-sm outline-none focus:bg-white/25 transition-colors"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSendReply()
                }}
                disabled={!replyText.trim() || sendingReply}
                className="size-10 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-40 flex items-center justify-center transition-colors"
              >
                {sendingReply ? (
                  <Loader2 className="size-4 text-white animate-spin" />
                ) : (
                  <Send className="size-4 text-white" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Group indicator dots */}
        {groups.length > 1 && (
          <div className={cn(
            "absolute left-1/2 -translate-x-1/2 flex gap-1.5 z-30",
            isOwn ? "bottom-4" : "bottom-[104px]"
          )}>
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
