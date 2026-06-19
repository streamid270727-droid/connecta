import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseImages } from "@/lib/format"

// POST /api/posts/[id]/save — toggle save (bookmark) a post
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    const post = await db.post.findUnique({ where: { id }, select: { id: true } })
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 })
    }

    const existing = await db.savedPost.findUnique({
      where: { postId_userId: { postId: id, userId: session.user.id } },
    })
    if (existing) {
      await db.savedPost.delete({ where: { id: existing.id } })
      return NextResponse.json({ saved: false })
    }

    await db.savedPost.create({
      data: { postId: id, userId: session.user.id },
    })
    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error("POST /api/posts/[id]/save error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
