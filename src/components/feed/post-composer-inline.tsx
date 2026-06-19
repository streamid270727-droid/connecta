"use client"

import { useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { ImagePlus, Video, Loader2, Send, Smile, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserAvatar } from "@/components/common/user-avatar"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/store"
import { getYouTubeId, getVimeoId } from "@/lib/format"
import type { FeedPost } from "@/components/feed/post-card"

interface PostComposerInlineProps {
  onPosted: (post: FeedPost) => void
}

export function PostComposerInline({ onPosted }: PostComposerInlineProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const setComposerOpen = useAppStore((s) => s.setComposerOpen)
  const [content, setContent] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [videoUrl, setVideoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showVideoInput, setShowVideoInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        const data = await res.json()
        onPosted(data.post)
        setContent("")
        setImages([])
        setVideoUrl("")
        setShowVideoInput(false)
        toast({ title: "Diposting!", description: "Postingan Anda telah dibagikan" })
      }
    } catch {
      toast({ title: "Terjadi kesalahan", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm">
      <div className="flex gap-2.5">
        <UserAvatar
          src={session?.user?.image ?? null}
          name={session?.user?.name ?? null}
          seed={session?.user?.id}
          size="md"
        />
        <div className="flex-1 space-y-2.5">
          <button
            onClick={() => setComposerOpen(true)}
            className="w-full text-left px-4 py-2.5 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground text-sm transition-colors"
          >
            Apa yang Anda pikirkan, {session?.user?.name?.split(" ")[0]}?
          </button>

          <div className="flex items-center gap-1 pt-1 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setComposerOpen(true)}
            >
              <ImagePlus className="size-4" />
              <span className="hidden sm:inline">Foto</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setComposerOpen(true)}
            >
              <Video className="size-4" />
              <span className="hidden sm:inline">Video</span>
            </Button>
            <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="size-3" />
              <span>Publik</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
