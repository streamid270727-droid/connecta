"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  ImagePlus,
  Video,
  Loader2,
  Send,
  X,
  Globe,
  Smile,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { UserAvatar } from "@/components/common/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"
import { getYouTubeId, getVimeoId } from "@/lib/format"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { FeedPost } from "@/components/feed/post-card"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (composerOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [composerOpen])

  const resetState = () => {
    setContent("")
    setImages([])
    setVideoUrl("")
    setShowVideoInput(false)
    setLoading(false)
    setUploadingImage(false)
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
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-center text-lg font-bold">
            Buat Postingan
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-3">
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
                <span className="font-semibold text-sm truncate">{session.user.name}</span>
                {session.user.isVerified && (
                  <CheckCircle2 className="size-3.5 fill-primary text-primary-foreground" />
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
            className="min-h-32 max-h-64 resize-none text-base border-0 focus-visible:ring-0 p-0 placeholder:text-muted-foreground/70"
            maxLength={5000}
          />

          {/* Character count */}
          {content.length > 0 && (
            <div className="text-right text-xs text-muted-foreground">
              {content.length}/5000
            </div>
          )}

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
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
                >
                  <X className="size-4" />
                </Button>
              </div>
              {videoUrl && (getYouTubeId(videoUrl) || getVimeoId(videoUrl)) && (
                <div className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" />
                  Video valid dan akan diembed
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 p-2 rounded-lg border">
            <span className="text-xs text-muted-foreground flex-1">Tambahkan ke postingan</span>
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
              className="size-8 text-emerald-600"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage || images.length >= 4}
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
              className="size-8 text-rose-600"
              onClick={() => setShowVideoInput((v) => !v)}
            >
              <Video className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-8 text-amber-600">
              <Smile className="size-4" />
            </Button>
          </div>

          <Button
            onClick={submit}
            disabled={loading || uploadingImage || (!content.trim() && images.length === 0 && !videoUrl.trim())}
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
