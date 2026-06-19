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

    const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Upsert like
    const existing = await db.like.findUnique({
      where: { postId_userId: { postId: id, userId: session.user.id } },
    })
    if (existing) {
      await db.like.delete({ where: { id: existing.id } })
      const count = await db.like.count({ where: { postId: id } })
      return NextResponse.json({ liked: false, count })
    }

    await db.like.create({
      data: { postId: id, userId: session.user.id },
    })
    const count = await db.like.count({ where: { postId: id } })

    // Notify post author
    if (post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: session.user.id,
          type: "like",
          entityId: id,
          content: "menyukai postingan Anda",
          isRead: false,
        },
      })
      try {
        const { notifyUser } = await import("@/lib/socket-server")
        await notifyUser(post.authorId, {
          title: "Suka baru",
          body: `${session.user.name} menyukai postingan Anda`,
          type: "like",
          entityId: id,
        })
      } catch {}
    }

    return NextResponse.json({ liked: true, count })
  } catch (error) {
    console.error("POST /api/posts/[id]/like error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
