"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ImagePlus, Video, Loader2, Send, X, Globe, Smile, CheckCircle2, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/common/user-avatar"
import { OptimizedImage } from "@/components/common/optimized-image"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"
import { getYouTubeId, getVimeoId } from "@/lib/format"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { FeedPost } from "@/components/feed/post-card"

interface LinkPreview {
  title: string
  description: string
  image: string | null
  url: string
  siteName: string | null
}

export function PostComposerDialog() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const { composerOpen, setComposerOpen, setView } = useAppStore()
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showVideoInput, setShowVideoInput] = useState(false)
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (composerOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [composerOpen])

  // Auto-fetch link preview when URL is detected in content
  useEffect(() => {
    if (!content.trim()) {
      setLinkPreview(null)
      return
    }

    // Extract first URL from content
    const urlMatch = content.match(/(https?:\/\/[^\s]+)/)
    if (!urlMatch) {
      setLinkPreview(null)
      return
    }

    const url = urlMatch[1]

    // Don't fetch if it's a YouTube/Vimeo URL (handled separately)
    if (getYouTubeId(url) || getVimeoId(url)) {
      setLinkPreview(null)
      return
    }

    // Don't fetch if preview already exists for this URL
    if (linkPreview?.url === url) return

    const controller = new AbortController()
    setLoadingPreview(true)

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/link-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          setLinkPreview(data.preview)
        }
      } catch {
        // Ignore abort errors
      } finally {
        setLoadingPreview(false)
      }
    }, 1000) // Debounce 1 second

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [content, linkPreview?.url])

  const resetState = () => {
    setContent("")
    setImages([])
    setVideoUrl("")
    setShowVideoInput(false)
    setLoading(false)
    setUploadingImage(false)
    setLinkPreview(null)
    setLoadingPreview(false)
  }

  const handleClose = (open: boolean) => {
    setComposerOpen(open)
    if (!open) {
      // Delay reset to avoid flicker
      setTimeout(resetState, 200)
    }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (images.length + files.length > 4) {
      toast({
        title: "Maksimal 4 gambar",
        description: "Hapus gambar yang ada untuk menambah yang baru",
        variant: "destructive",
      })
      return
    }
    setUploadingImage(true)
    try {
      const uploaded: string[] = []
      for (const file of files) {
        if (file.size > 4 * 1024 * 1024) {
          toast({ title: `${file.name} terlalu besar (maks 4MB)`, variant: "destructive" })
          continue
        }
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) {
          toast({ title: `Gagal mengunggah ${file.name}`, variant: "destructive" })
          continue
        }
        const data = await res.json()
        uploaded.push(data.url)
      }
      setImages((prev) => [...prev, ...uploaded])
    } catch {
      toast({ title: "Gagal mengunggah gambar", variant: "destructive" })
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const submit = async () => {
    if (loading) return
    if (!content.trim() && images.length === 0 && !videoUrl.trim()) {
      toast({ title: "Postingan tidak boleh kosong", variant: "destructive" })
      return
    }
    if (videoUrl.trim() && !getYouTubeId(videoUrl) && !getVimeoId(videoUrl)) {
      toast({
        title: "URL video tidak valid",
        description: "Gunakan link YouTube atau Vimeo",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          images,
          videoUrl: videoUrl.trim() || null,
          linkPreview: linkPreview || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast({ title: "Gagal", description: data.error, variant: "destructive" })
      } else {
        toast({ title: "Diposting!", description: "Postingan Anda telah dibagikan" })
        setComposerOpen(false)
        setView("feed")
        resetState()
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  if (!session?.user) return null

  return (
    <Dialog open={composerOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b p-4">
          <DialogTitle className="text-center text-lg font-bold">Buat Postingan</DialogTitle>
          <DialogDescription className="sr-only text-center text-xs">
            Bagikan pembaruan teks, foto, atau video dengan teman Anda.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {/* User info */}
          <div className="flex items-center gap-2.5">
            <UserAvatar
              src={session.user.image ?? null}
              name={session.user.name ?? null}
              seed={session.user.id}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold">{session.user.name}</span>
                {session.user.isVerified && (
                  <CheckCircle2 className="fill-primary text-primary-foreground size-3.5" />
                )}
              </div>
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <Globe className="size-3" />
                <span>Publik</span>
              </div>
            </div>
          </div>

          {/* Content textarea */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Apa yang Anda pikirkan, ${session.user.name?.split(" ")[0]}?`}
            className="placeholder:text-muted-foreground/70 max-h-64 min-h-32 resize-none border-0 p-0 text-base focus-visible:ring-0"
            maxLength={5000}
          />

          {/* Character count */}
          {content.length > 0 && (
            <div className="text-muted-foreground text-right text-xs">{content.length}/5000</div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="group bg-muted relative aspect-square overflow-hidden rounded-lg"
                >
                  <OptimizedImage src={img} alt="" fill className="object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                    aria-label="Hapus gambar"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Link preview */}
          {loadingPreview && (
            <div className="bg-muted/30 text-muted-foreground flex items-center gap-2 rounded-lg border p-3 text-sm">
              <Loader2 className="size-4 animate-spin" />
              <span>Mengambil pratinjau link...</span>
            </div>
          )}
          {linkPreview && !loadingPreview && (
            <div className="bg-muted/30 relative overflow-hidden rounded-lg border">
              {linkPreview.image && (
                <img
                  src={linkPreview.image}
                  alt={linkPreview.title}
                  className="h-32 w-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              )}
              <div className="p-3">
                <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[11px]">
                  <Link2 className="size-3" />
                  <span>{linkPreview.siteName || new URL(linkPreview.url).hostname}</span>
                </div>
                <p className="line-clamp-2 text-sm font-medium">{linkPreview.title}</p>
                {linkPreview.description && (
                  <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                    {linkPreview.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setLinkPreview(null)}
                className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
                aria-label="Hapus pratinjau link"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Video URL input */}
          {showVideoInput && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="Tempel URL YouTube atau Vimeo"
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setVideoUrl("")
                    setShowVideoInput(false)
                  }}
                  aria-label="Tutup input video"
                >
                  <X className="size-4" />
                </Button>
              </div>
              {videoUrl && (getYouTubeId(videoUrl) || getVimeoId(videoUrl)) && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  Video valid dan akan diembed
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3 px-4 pb-4">
          <div className="flex items-center gap-2 rounded-lg border p-2">
            <span className="text-muted-foreground flex-1 text-xs">Tambahkan ke postingan</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-emerald-600 dark:text-emerald-400"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || images.length >= 4}
              aria-label="Tambah gambar"
            >
              {uploadingImage ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImagePlus className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-rose-600 dark:text-rose-400"
              onClick={() => setShowVideoInput((v) => !v)}
              aria-label="Tambah video"
            >
              <Video className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-amber-600 dark:text-amber-400"
              aria-label="Pilih emoji"
            >
              <Smile className="size-4" />
            </Button>
          </div>

          <Button
            onClick={submit}
            disabled={
              loading ||
              uploadingImage ||
              (!content.trim() && images.length === 0 && !videoUrl.trim())
            }
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Memposting...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Posting
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
