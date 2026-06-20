"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { Plus, Loader2, Camera, X, Send, Eye, Smile } from "lucide-react"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { formatRelativeTime, getAvatarGradient } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { StoryViewer } from "@/components/stories/story-viewer"

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

export function StoriesBar() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [groups, setGroups] = useState<StoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories")
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroups(data.groups || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStories()
    // Refresh every 60s to expire stories
    const interval = setInterval(loadStories, 60000)
    return () => clearInterval(interval)
  }, [loadStories])

  const openViewer = (idx: number) => {
    setViewerGroupIdx(idx)
    setViewerOpen(true)
  }

  const handleViewerClose = () => {
    setViewerOpen(false)
    void loadStories() // refresh viewed status
  }

  // Find current user's story group index (if any)
  const myGroupIdx = groups.findIndex((g) => g.author.id === session?.user?.id)
  const hasMyStory = myGroupIdx !== -1

  if (!loading && groups.length === 0 && !session?.user) return null

  return (
    <>
      <div className="rounded-2xl border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
          {/* Add story / My story */}
          <button
            onClick={() => {
              if (hasMyStory) {
                openViewer(myGroupIdx)
              } else {
                setComposerOpen(true)
              }
            }}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div className="relative">
              <div
                className={cn(
                  "p-0.5 rounded-full transition-transform group-hover:scale-105",
                  hasMyStory
                    ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                    : "bg-muted"
                )}
              >
                <div className="p-0.5 rounded-full bg-background">
                  <UserAvatar
                    src={session?.user?.image ?? null}
                    name={session?.user?.name ?? null}
                    seed={session?.user?.id}
                    size="lg"
                  />
                </div>
              </div>
              {!hasMyStory && (
                <div className="absolute -bottom-0.5 -right-0.5 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background">
                  <Plus className="size-3.5" />
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground max-w-16 truncate">
              {hasMyStory ? "Story Anda" : "Tambah Story"}
            </span>
          </button>

          {/* Divider */}
          {groups.length > 0 && (
            <div className="h-12 w-px bg-border shrink-0" />
          )}

          {/* Other users' stories */}
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="size-16 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-12 rounded bg-muted animate-pulse" />
              </div>
            ))
          ) : (
            groups
              .filter((g) => g.author.id !== session?.user?.id)
              .map((group, idx) => {
                // Find actual index in groups array
                const actualIdx = groups.indexOf(group)
                return (
                  <button
                    key={group.author.id}
                    onClick={() => openViewer(actualIdx)}
                    className="flex flex-col items-center gap-1.5 shrink-0 group"
                  >
                    <div
                      className={cn(
                        "p-0.5 rounded-full transition-transform group-hover:scale-105",
                        group.hasUnviewed
                          ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                          : "bg-muted"
                      )}
                    >
                      <div className="p-0.5 rounded-full bg-background">
                        <UserAvatar
                          src={group.author.avatarUrl}
                          name={group.author.name}
                          seed={group.author.id}
                          size="lg"
                        />
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground max-w-16 truncate">
                      {group.author.name.split(" ")[0]}
                    </span>
                  </button>
                )
              })
          )}
        </div>
      </div>

      {/* Story viewer */}
      {viewerOpen && groups[viewerGroupIdx] && (
        <StoryViewer
          groups={groups}
          initialGroupIdx={viewerGroupIdx}
          onClose={handleViewerClose}
        />
      )}

      {/* Story composer */}
      <StoryComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onCreated={() => {
          setComposerOpen(false)
          void loadStories()
        }}
      />
    </>
  )
}

// ============================================================
// Story Composer
// ============================================================

const STORY_GRADIENTS = [
  { id: "g1", class: "from-rose-500 to-pink-600", color: "#ffffff" },
  { id: "g2", class: "from-violet-500 to-purple-700", color: "#ffffff" },
  { id: "g3", class: "from-amber-400 to-orange-600", color: "#ffffff" },
  { id: "g4", class: "from-emerald-400 to-teal-600", color: "#ffffff" },
  { id: "g5", class: "from-sky-400 to-cyan-600", color: "#ffffff" },
  { id: "g6", class: "from-fuchsia-500 to-pink-700", color: "#ffffff" },
  { id: "g7", class: "from-slate-700 to-slate-900", color: "#ffffff" },
  { id: "g8", class: "from-indigo-500 to-violet-700", color: "#ffffff" },
]

export function StoryComposer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [content, setContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [gradient, setGradient] = useState(STORY_GRADIENTS[0])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const QUICK_EMOJIS = ["😀", "😂", "😍", "🥳", "😎", "🤔", "😢", "🔥", "✨", "❤️", "👍", "🎉", "💯", "🙏", "😭", "🥰", "👀", "💪", "🌟", "😊"]

  const reset = () => {
    setContent("")
    setMediaUrl(null)
    setGradient(STORY_GRADIENTS[0])
    setLoading(false)
    setUploading(false)
  }

  const handleClose = (o: boolean) => {
    onOpenChange(o)
    if (!o) setTimeout(reset, 200)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Ukuran maks 4MB", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMediaUrl(data.url)
    } catch {
      toast({ title: "Gagal mengunggah", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const submit = async () => {
    if (loading) return
    if (!content.trim() && !mediaUrl) {
      toast({ title: "Story tidak boleh kosong", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaUrl,
          content: content.trim() || null,
          bgColor: mediaUrl ? null : gradient.class,
          textColor: gradient.color,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Story dibagikan!", description: "Akan hilang dalam 24 jam" })
        onCreated()
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center text-lg font-bold">
            Buat Story
          </DialogTitle>
          <DialogDescription className="text-center text-xs sr-only">
            Story akan hilang otomatis setelah 24 jam.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-3">
          {/* Preview */}
          <div className="relative aspect-[9/16] max-h-80 rounded-2xl overflow-hidden bg-muted">
            {mediaUrl ? (
              <img src={mediaUrl} alt="Story preview" className="w-full h-full object-cover" />
            ) : (
              <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center p-6", gradient.class)}>
                <p
                  className="text-center text-xl font-bold whitespace-pre-wrap break-words leading-snug"
                  style={{ color: gradient.color }}
                >
                  {content || "Tulis sesuatu..."}
                </p>
              </div>
            )}
            {/* Author badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
              <UserAvatar
                src={session?.user?.image ?? null}
                name={session?.user?.name ?? null}
                seed={session?.user?.id}
                size="xs"
              />
              <span className="text-xs font-medium text-white">
                {session?.user?.name?.split(" ")[0]}
              </span>
            </div>
          </div>

          {/* Controls */}
          {mediaUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setMediaUrl(null)}
            >
              <X className="size-4" />
              Hapus foto, ganti dengan teks
            </Button>
          ) : (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis cerita Anda..."
                maxLength={280}
                className="resize-none"
                rows={2}
              />
              {/* Emoji row */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setShowEmojis((o) => !o)}
                  type="button"
                >
                  <Smile className="size-4 text-muted-foreground" />
                </Button>
                {showEmojis && (
                  <div className="flex flex-wrap gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setContent((c) => c + emoji)}
                        className="size-8 flex items-center justify-center text-lg hover:bg-accent rounded-lg transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STORY_GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGradient(g)}
                    className={cn(
                      "size-8 rounded-full bg-gradient-to-br ring-2 ring-offset-2 ring-offset-background transition-all",
                      g.class,
                      gradient.id === g.id ? "ring-primary scale-110" : "ring-transparent"
                    )}
                    aria-label={`Pilih warna ${g.id}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Upload photo option */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="flex gap-2">
            {!mediaUrl && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Foto
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1"
              onClick={submit}
              disabled={loading || uploading || (!content.trim() && !mediaUrl)}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Bagikan
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            Story akan hilang otomatis setelah 24 jam.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
