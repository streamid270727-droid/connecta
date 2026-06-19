import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    const comments = await db.comment.findMany({
      where: { postId: id, parentId: null },
      orderBy: { createdAt: "asc" },
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
        replies: {
          orderBy: { createdAt: "asc" },
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
            _count: { select: { likes: true } },
            likes: { where: { userId: session.user.id }, select: { id: true } },
          },
        },
        _count: { select: { likes: true } },
        likes: { where: { userId: session.user.id }, select: { id: true } },
      },
    })

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        author: c.author,
        liked: c.likes.length > 0,
        likeCount: c._count.likes,
        replies: c.replies.map((r) => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt,
          author: r.author,
          liked: r.likes.length > 0,
          likeCount: r._count.likes,
        })),
      })),
    })
  } catch (error) {
    console.error("GET /api/posts/[id]/comments error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

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
    const body = await request.json()
    const { content, parentId } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Komentar tidak boleh kosong" }, { status: 400 })
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "Komentar terlalu panjang" }, { status: 400 })
    }

    const post = await db.post.findUnique({ where: { id }, select: { authorId: true } })
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 })
    }

    // If parentId, ensure 1-level only
    if (parentId) {
      const parent = await db.comment.findUnique({
        where: { id: parentId },
        select: { parentId: true, authorId: true },
      })
      if (!parent) {
        return NextResponse.json({ error: "Komentar induk tidak ditemukan" }, { status: 404 })
      }
      if (parent.parentId) {
        return NextResponse.json(
          { error: "Hanya 1 tingkat balasan yang diizinkan" },
          { status: 400 }
        )
      }

      const comment = await db.comment.create({
        data: {
          content: content.trim(),
          postId: id,
          authorId: session.user.id,
          parentId,
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
        },
      })

      // Notify parent comment author (not self)
      if (parent.authorId !== session.user.id) {
        await db.notification.create({
          data: {
            recipientId: parent.authorId,
            actorId: session.user.id,
            type: "reply",
            entityId: comment.id,
            content: "membalas komentar Anda",
            isRead: false,
          },
        })
        try {
          const { notifyUser } = await import("@/lib/socket-server")
          await notifyUser(parent.authorId, {
            title: "Balasan baru",
            body: `${session.user.name} membalas komentar Anda`,
            type: "reply",
            entityId: comment.id,
          })
        } catch {}
      }

      return NextResponse.json({
        comment: {
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          author: comment.author,
          liked: false,
          likeCount: 0,
        },
      })
    }

    const comment = await db.comment.create({
      data: {
        content: content.trim(),
        postId: id,
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
      },
    })

    // Notify post author
    if (post.authorId !== session.user.id) {
      await db.notification.create({
        data: {
          recipientId: post.authorId,
          actorId: session.user.id,
          type: "comment",
          entityId: comment.id,
          content: "mengomentari postingan Anda",
          isRead: false,
        },
      })
      try {
        const { notifyUser } = await import("@/lib/socket-server")
        await notifyUser(post.authorId, {
          title: "Komentar baru",
          body: `${session.user.name} mengomentari postingan Anda`,
          type: "comment",
          entityId: comment.id,
        })
      } catch {}
    }

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: comment.author,
        liked: false,
        likeCount: 0,
        replies: [],
      },
    })
  } catch (error) {
    console.error("POST /api/posts/[id]/comments error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
