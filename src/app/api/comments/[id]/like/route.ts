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

    const comment = await db.comment.findUnique({
      where: { id },
      select: { authorId: true },
    })
    if (!comment) {
      return NextResponse.json({ error: "Komentar tidak ditemukan" }, { status: 404 })
    }

    const existing = await db.commentLike.findUnique({
      where: { commentId_userId: { commentId: id, userId: session.user.id } },
    })
    if (existing) {
      await db.commentLike.delete({ where: { id: existing.id } })
      const count = await db.commentLike.count({ where: { commentId: id } })
      return NextResponse.json({ liked: false, count })
    }

    await db.commentLike.create({
      data: { commentId: id, userId: session.user.id },
    })
    const count = await db.commentLike.count({ where: { commentId: id } })

    if (comment.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          recipientId: comment.authorId,
          actorId: session.user.id,
          type: "like",
          entityId: id,
          content: "menyukai komentar Anda",
          isRead: false,
        },
      })
      try {
        const { notifyUser } = await import("@/lib/socket-server")
        await notifyUser(comment.authorId, {
          title: "Suka baru",
          body: `${session.user.name} menyukai komentar Anda`,
          type: "like",
          entityId: id,
        })
      } catch {}
    }

    return NextResponse.json({ liked: true, count })
  } catch (error) {
    console.error("POST /api/comments/[id]/like error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
