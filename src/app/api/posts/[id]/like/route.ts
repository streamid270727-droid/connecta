import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

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

    // Parse body for optional emoji reaction
    let emoji: string | null = null
    try {
      const body = await request.json()
      if (body.emoji && typeof body.emoji === "string") {
        emoji = body.emoji
      }
    } catch {}

    const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Upsert like
    const existing = await db.like.findUnique({
      where: { postId_userId: { postId: id, userId: session.user.id } },
    })

    if (existing) {
      if (emoji && existing.emoji === emoji) {
        // Same reaction → toggle off
        await db.like.delete({ where: { id: existing.id } })
        const count = await db.like.count({ where: { postId: id } })
        return NextResponse.json({ liked: false, emoji: null, count })
      }
      if (emoji) {
        // Update reaction
        await db.like.update({ where: { id: existing.id }, data: { emoji } })
        const count = await db.like.count({ where: { postId: id } })
        return NextResponse.json({ liked: true, emoji, count })
      }
      // Plain like on existing reaction → remove
      await db.like.delete({ where: { id: existing.id } })
      const count = await db.like.count({ where: { postId: id } })
      return NextResponse.json({ liked: false, emoji: null, count })
    }

    // Create new like/reaction
    await db.like.create({
      data: { postId: id, userId: session.user.id, emoji },
    })
    const count = await db.like.count({ where: { postId: id } })

    // Notify post author
    if (post.authorId !== session.user.id) {
      const reactionText = emoji ? `bereaksi "${emoji}"` : "menyukai"
      await db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: session.user.id,
          type: "like",
          entityId: id,
          content: `${reactionText} postingan Anda`,
          isRead: false,
        },
      })
      try {
        const { notifyUser } = await import("@/lib/socket-server")
        await notifyUser(post.authorId, {
          title: "Reaksi baru",
          body: `${session.user.name} ${reactionText} postingan Anda`,
          type: "like",
          entityId: id,
        })
      } catch {}
    }

    return NextResponse.json({ liked: true, emoji, count })
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
