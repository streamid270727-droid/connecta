"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { Plus, Loader2, Camera, X, Send, Smile } from "lucide-react"
import { UserAvatar } from "@/components/common/user-avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import dynamic from "next/dynamic"
import { useStories, useCreateStory } from "@/hooks/api/use-stories"
import { OptimizedImage } from "@/components/common/optimized-image"

const StoryViewer = dynamic(
  () => import("@/components/stories/story-viewer").then((m) => ({ default: m.StoryViewer })),
  { ssr: false }
)

interface StoryGroup {
  author: {
    id: string
    name: string
    username: string
    avatarUrl: string | null
    isVerified: boolean
  }
  stories: any[]
  hasUnviewed: boolean
}

export function StoriesBar() {
  const { data: session } = useSession()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0)
  const [composerOpen, setComposerOpen] = useState(false)

  const storiesQuery = useStories()
  const groups: StoryGroup[] = storiesQuery.data ?? []

  const openViewer = (idx: number) => {
    setViewerGroupIdx(idx)
    setViewerOpen(true)
  }

  const handleViewerClose = () => {
    setViewerOpen(false)
    storiesQuery.refetch()
  }

  const myGroupIdx = groups.findIndex((g) => g.author.id === session?.user?.id)
  const hasMyStory = myGroupIdx !== -1

  if (!storiesQuery.isLoading && groups.length === 0 && !session?.user) return null

  return (
    <>
      <div className="bg-card rounded-2xl border p-3 shadow-sm">
        <div className="no-scrollbar flex items-center gap-3 overflow-x-auto pb-1">
          {/* Add story / My story */}
          <button
            onClick={() => {
              if (hasMyStory) {
                openViewer(myGroupIdx)
              } else {
                setComposerOpen(true)
              }
            }}
            className="group flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="relative">
              <div
                className={cn(
                  "rounded-full p-0.5 transition-transform group-hover:scale-105",
                  hasMyStory
                    ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                    : "bg-muted"
                )}
              >
                <div className="bg-background rounded-full p-0.5">
                  <UserAvatar
                    src={session?.user?.image ?? null}
                    name={session?.user?.name ?? null}
                    seed={session?.user?.id}
                    size="lg"
                  />
                </div>
              </div>
              {!hasMyStory && (
                <div className="bg-primary text-primary-foreground ring-background absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full ring-2">
                  <Plus className="size-3.5" />
                </div>
              )}
            </div>
            <span className="text-muted-foreground max-w-16 truncate text-xs font-medium">
              {hasMyStory ? "Story Anda" : "Tambah Story"}
            </span>
          </button>

          {groups.length > 0 && <div className="bg-border h-12 w-px shrink-0" />}

          {storiesQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex shrink-0 flex-col items-center gap-1.5">
                  <div className="bg-muted size-16 animate-pulse rounded-full" />
                  <div className="bg-muted h-3 w-12 animate-pulse rounded" />
                </div>
              ))
            : groups
                .filter((g) => g.author.id !== session?.user?.id)
                .map((group) => {
                  const actualIdx = groups.indexOf(group)
                  return (
                    <button
                      key={group.author.id}
                      onClick={() => openViewer(actualIdx)}
                      className="group flex shrink-0 flex-col items-center gap-1.5"
                    >
                      <div
                        className={cn(
                          "rounded-full p-0.5 transition-transform group-hover:scale-105",
                          group.hasUnviewed
                            ? "bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600"
                            : "bg-muted"
                        )}
                      >
                        <div className="bg-background rounded-full p-0.5">
                          <UserAvatar
                            src={group.author.avatarUrl}
                            name={group.author.name}
                            seed={group.author.id}
                            size="lg"
                          />
                        </div>
                      </div>
                      <span className="text-muted-foreground max-w-16 truncate text-xs font-medium">
                        {group.author.name.split(" ")[0]}
                      </span>
                    </button>
                  )
                })}
        </div>
      </div>

      {viewerOpen && groups[viewerGroupIdx] && (
        <StoryViewer groups={groups} initialGroupIdx={viewerGroupIdx} onClose={handleViewerClose} />
      )}

      <StoryComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onCreated={() => {
          setComposerOpen(false)
          storiesQuery.refetch()
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
  const [uploading, setUploading] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const createStory = useCreateStory()

  const QUICK_EMOJIS = [
    "😀",
    "😂",
    "😍",
    "🥳",
    "😎",
    "🤔",
    "😢",
    "🔥",
    "✨",
    "❤️",
    "👍",
    "🎉",
    "💯",
    "🙏",
    "😭",
    "🥰",
    "👀",
    "💪",
    "🌟",
    "😊",
  ]

  const reset = () => {
    setContent("")
    setMediaUrl(null)
    setGradient(STORY_GRADIENTS[0])
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
    if (createStory.isPending) return
    if (!content.trim() && !mediaUrl) {
      toast({ title: "Story tidak boleh kosong", variant: "destructive" })
      return
    }
    try {
      await createStory.mutateAsync({
        mediaUrl: mediaUrl ?? undefined,
        content: content.trim() || undefined,
        bgColor: mediaUrl ? undefined : gradient.class,
        textColor: gradient.color,
      })
      toast({ title: "Story dibagikan!", description: "Akan hilang dalam 24 jam" })
      onCreated()
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-center text-lg font-bold">Buat Story</DialogTitle>
          <DialogDescription className="sr-only text-center text-xs">
            Story akan hilang otomatis setelah 24 jam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {/* Preview */}
          <div className="bg-muted relative aspect-[9/16] max-h-80 overflow-hidden rounded-2xl">
            {mediaUrl ? (
              <OptimizedImage src={mediaUrl} alt="Story preview" fill className="object-cover" />
            ) : (
              <div
                className={cn(
                  "flex h-full w-full items-center justify-center bg-gradient-to-br p-6",
                  gradient.class
                )}
              >
                <p
                  className="text-center text-xl leading-snug font-bold break-words whitespace-pre-wrap"
                  style={{ color: gradient.color }}
                >
                  {content || "Tulis sesuatu..."}
                </p>
              </div>
            )}
            <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-black/50 px-2.5 py-1 backdrop-blur-sm">
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
              <X className="size-4" /> Hapus foto, ganti dengan teks
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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => setShowEmojis((o) => !o)}
                  type="button"
                  aria-label="Pilih emoji"
                  aria-expanded={showEmojis}
                >
                  <Smile className="text-muted-foreground size-4" />
                </Button>
                {showEmojis && (
                  <div className="flex flex-wrap gap-1">
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setContent((c) => c + emoji)}
                        className="hover:bg-accent flex size-8 items-center justify-center rounded-lg text-lg transition-colors"
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
                      "ring-offset-background size-8 rounded-full bg-gradient-to-br ring-2 ring-offset-2 transition-all",
                      g.class,
                      gradient.id === g.id ? "ring-primary scale-110" : "ring-transparent"
                    )}
                    aria-label={`Warna latar ${g.id}`}
                    aria-pressed={gradient.id === g.id}
                  />
                ))}
              </div>
            </>
          )}

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
              disabled={createStory.isPending || uploading || (!content.trim() && !mediaUrl)}
            >
              {createStory.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Bagikan
            </Button>
          </div>
          <p className="text-muted-foreground text-center text-[11px]">
            Story akan hilang otomatis setelah 24 jam.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
