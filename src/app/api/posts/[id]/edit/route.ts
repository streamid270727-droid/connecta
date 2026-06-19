import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { unlink } from "fs/promises"
import path from "path"

// PUT /api/posts/[id]/edit — edit own post content and images
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params
    const body = await request.json()
    const { content, images } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Konten tidak boleh kosong" }, { status: 400 })
    }
    if (content.length > 5000) {
      return NextResponse.json(
        { error: "Konten terlalu panjang (maks 5000 karakter)" },
        { status: 400 }
      )
    }

    const post = await db.post.findUnique({
      where: { id },
      select: { authorId: true, images: true },
    })
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 })
    }
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
    }

    const updateData: { content: string; images?: string } = {
      content: content.trim(),
    }

    // Update images if provided
    if (Array.isArray(images)) {
      // Validate max 4 images
      if (images.length > 4) {
        return NextResponse.json(
          { error: "Maksimal 4 gambar" },
          { status: 400 }
        )
      }

      // Delete removed images from disk
      const oldImages: string[] = post.images ? JSON.parse(String(post.images)) : []
      const removedImages = oldImages.filter((img: string) => !images.includes(img))
      for (const img of removedImages) {
        try {
          const filePath = path.join(process.cwd(), "public", img)
          await unlink(filePath)
        } catch {
          // ignore if file doesn't exist
        }
      }

      updateData.images = JSON.stringify(images)
    }

    await db.post.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, content: content.trim(), images: updateData.images })
  } catch (error) {
    console.error("PUT /api/posts/[id]/edit error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
