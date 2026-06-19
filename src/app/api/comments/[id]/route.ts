import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

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
      return NextResponse.json({ error: "Komentar tidak boleh kosong" }, { status: 400 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "Komentar terlalu panjang" }, { status: 400 })
    }

    const comment = await db.comment.findUnique({
      where: { id },
      select: { authorId: true },
    })

    if (!comment) {
      return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 })
    }

    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
    }

    const updated = await db.comment.update({
      where: { id },
      data: { content: content.trim() },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    })

    return NextResponse.json({
      comment: {
        id: updated.id,
        content: updated.content,
        createdAt: updated.createdAt,
        author: updated.author,
      },
    })
  } catch (error) {
    console.error("PUT /api/comments/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    const comment = await db.comment.findUnique({
      where: { id },
      select: { authorId: true, postId: true },
    })

    if (!comment) {
      return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 })
    }

    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
    }

    // Delete replies first, then the comment itself
    await db.comment.deleteMany({ where: { parentId: id } })
    await db.comment.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/comments/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
