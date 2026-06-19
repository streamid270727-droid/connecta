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

    // Check if already shared
    const existing = await db.share.findUnique({
      where: { postId_userId: { postId: id, userId: session.user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Anda sudah membagikan postingan ini" }, { status: 400 })
    }

    // Create a new post that shares the original
    const sharedPost = await db.post.create({
      data: {
        content: "",
        sharedFromId: id,
        authorId: session.user.id,
      },
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
        _count: { select: { likes: true, comments: true, shares: true } },
      },
    })

    await db.share.create({
      data: { postId: id, userId: session.user.id },
    })

    // Notify original author
    if (post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: session.user.id,
          type: "share",
          entityId: sharedPost.id,
          content: "membagikan postingan Anda",
          isRead: false,
        },
      })
      try {
        const { notifyUser } = await import("@/lib/socket-server")
        await notifyUser(post.authorId, {
          title: "Postingan dibagikan",
          body: `${session.user.name} membagikan postingan Anda`,
          type: "share",
          entityId: sharedPost.id,
        })
      } catch {}
    }

    return NextResponse.json({
      success: true,
      sharedPost: {
        id: sharedPost.id,
        content: sharedPost.content,
        images: sharedPost.images,
        videoUrl: sharedPost.videoUrl,
        createdAt: sharedPost.createdAt,
        author: sharedPost.author,
        _count: sharedPost._count,
        sharedFromId: id,
      },
    })
  } catch (error) {
    console.error("POST /api/posts/[id]/share error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
