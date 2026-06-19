import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseImages } from "@/lib/format"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)
    const scope = searchParams.get("scope") || "friends" // friends | discover

    // Get user's friends
    const friendships = await db.friendship.findMany({
      where: { userId: session.user.id },
      select: { friendId: true },
    })
    const friendIds = friendships.map((f) => f.friendId)
    const authorIds =
      scope === "friends" ? [...friendIds, session.user.id] : undefined

    const posts = await db.post.findMany({
      where: authorIds ? { authorId: { in: authorIds } } : {},
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
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
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
          },
        },
        likes: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        shares: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        savedBy: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        sharedFrom: {
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
        },
      },
    })

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, limit) : posts
    const nextCursor = hasMore ? items[items.length - 1].id : null

    return NextResponse.json({
      posts: items.map((p) => ({
        id: p.id,
        content: p.content,
        images: parseImages(p.images),
        videoUrl: p.videoUrl,
        createdAt: p.createdAt,
        author: p.author,
        liked: p.likes.length > 0,
        shared: p.shares.length > 0,
        saved: p.savedBy.length > 0,
        _count: p._count,
        sharedFrom: p.sharedFrom
          ? {
              id: p.sharedFrom.id,
              content: p.sharedFrom.content,
              images: parseImages(p.sharedFrom.images),
              videoUrl: p.sharedFrom.videoUrl,
              createdAt: p.sharedFrom.createdAt,
              author: p.sharedFrom.author,
            }
          : null,
      })),
      nextCursor,
    })
  } catch (error) {
    console.error("GET /api/posts error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, images, videoUrl, sharedFromId } = body

    if (!content && !images?.length && !videoUrl && !sharedFromId) {
      return NextResponse.json(
        { error: "Postingan tidak boleh kosong" },
        { status: 400 }
      )
    }

    if (content && content.length > 5000) {
      return NextResponse.json(
        { error: "Konten terlalu panjang (maks 5000 karakter)" },
        { status: 400 }
      )
    }

    if (images && (!Array.isArray(images) || images.length > 4)) {
      return NextResponse.json(
        { error: "Maksimal 4 gambar per postingan" },
        { status: 400 }
      )
    }

    const post = await db.post.create({
      data: {
        content: content || "",
        images: images?.length ? JSON.stringify(images) : null,
        videoUrl: videoUrl || null,
        sharedFromId: sharedFromId || null,
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

    // If this is a share, notify the original author
    if (sharedFromId) {
      const original = await db.post.findUnique({
        where: { id: sharedFromId },
        select: { authorId: true },
      })
      if (original && original.authorId !== session.user.id) {
        await db.notification.create({
          data: {
            recipientId: original.authorId,
            actorId: session.user.id,
            type: "share",
            entityId: post.id,
            content: "memiliki postingan Anda",
            isRead: false,
          },
        })
        // Emit socket notification
        try {
          const { notifyUser } = await import("@/lib/socket-server")
          await notifyUser(original.authorId, {
            title: "Postingan dibagikan",
            body: `${session.user.name} membagikan postingan Anda`,
            type: "share",
            entityId: post.id,
          })
        } catch {}
      }
    }

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        images: parseImages(post.images),
        videoUrl: post.videoUrl,
        createdAt: post.createdAt,
        author: post.author,
        liked: false,
        shared: false,
        saved: false,
        _count: post._count,
      },
    })
  } catch (error) {
    console.error("POST /api/posts error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
