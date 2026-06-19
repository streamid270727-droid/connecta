import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// PUT /api/posts/[id]/edit — edit own post content (text only; images/video unchanged for MVP)
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
    const { content } = body

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
      select: { authorId: true },
    })
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 })
    }
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
    }

    await db.post.update({
      where: { id },
      data: { content: content.trim() },
    })

    return NextResponse.json({ success: true, content: content.trim() })
  } catch (error) {
    console.error("PUT /api/posts/[id]/edit error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
