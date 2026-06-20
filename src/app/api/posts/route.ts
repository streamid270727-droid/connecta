import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseImages } from "@/lib/format"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const createPostSchema = z.object({
  content: z.string().max(5000, "Konten terlalu panjang (maks 5000 karakter)").optional(),
  images: z.array(z.string()).max(4, "Maksimal 4 gambar per postingan").optional(),
  videoUrl: z.string().optional().nullable(),
  sharedFromId: z.string().optional().nullable(),
}).refine(
  (data) => data.content || data.images?.length || data.videoUrl || data.sharedFromId,
  { message: "Postingan tidak boleh kosong" }
)

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)
    const scope = searchParams.get("scope") || "all" // all | friends | discover

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
          select: { userId: true, emoji: true },
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
      posts: items.map((p) => {
        const userLike = p.likes.find((l) => l.userId === session.user.id)
        const reactionMap: Record<string, number> = {}
        for (const l of p.likes) {
          if (l.emoji) {
            reactionMap[l.emoji] = (reactionMap[l.emoji] || 0) + 1
          }
        }
        const reactionSummary = Object.entries(reactionMap)
          .map(([emoji, count]) => ({ emoji, count }))
          .sort((a, b) => b.count - a.count)
        return {
          id: p.id,
          content: p.content,
          images: parseImages(p.images),
          videoUrl: p.videoUrl,
          createdAt: p.createdAt,
          author: p.author,
          liked: !!userLike,
          emoji: userLike?.emoji || null,
          reactionSummary,
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
        }
      }),
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

    // Rate limit: 10 posts per minute per user
    const { success } = rateLimit(`posts:${session.user.id}`, 10, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak postingan. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = createPostSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { content, images, videoUrl, sharedFromId } = parsed.data

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
        } catch (e) {
          console.error("Failed to send share notification:", e)
        }
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
