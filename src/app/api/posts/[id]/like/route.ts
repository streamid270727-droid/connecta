import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"

async function getReactionSummary(postId: string) {
  const allLikes = await db.like.findMany({
    where: { postId },
    select: { emoji: true },
  })
  const reactionMap: Record<string, number> = {}
  for (const l of allLikes) {
    if (l.emoji) {
      reactionMap[l.emoji] = (reactionMap[l.emoji] || 0) + 1
    }
  }
  return Object.entries(reactionMap)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    // Rate limit: 30 reactions per minute per user
    const { success } = rateLimit(`post-likes:${session.user.id}`, 30, 60000)
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." },
        { status: 429 }
      )
    }

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
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 })
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
        const reactionSummary = await getReactionSummary(id)
        return NextResponse.json({ liked: false, emoji: null, count, reactionSummary })
      }
      if (emoji) {
        // Update reaction
        await db.like.update({ where: { id: existing.id }, data: { emoji } })
        const count = await db.like.count({ where: { postId: id } })
        const reactionSummary = await getReactionSummary(id)
        return NextResponse.json({ liked: true, emoji, count, reactionSummary })
      }
      // Plain like on existing reaction → remove
      await db.like.delete({ where: { id: existing.id } })
      const count = await db.like.count({ where: { postId: id } })
      const reactionSummary = await getReactionSummary(id)
      return NextResponse.json({ liked: false, emoji: null, count, reactionSummary })
    }

    // Create new like/reaction
    await db.like.create({
      data: { postId: id, userId: session.user.id, emoji },
    })
    const count = await db.like.count({ where: { postId: id } })
    const reactionSummary = await getReactionSummary(id)

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
      } catch (e) {
        console.error("Failed to send reaction notification:", e)
      }
    }

    return NextResponse.json({ liked: true, emoji, count, reactionSummary })
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
