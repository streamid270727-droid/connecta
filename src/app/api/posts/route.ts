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
  linkPreview: z
    .object({
      title: z.string(),
      description: z.string(),
      image: z.string().nullable(),
      url: z.string(),
      siteName: z.string().nullable(),
    })
    .optional()
    .nullable(),
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

    // Get user's friends (only needed for friends scope)
    const authorIds =
      scope === "friends"
        ? (await db.friendship.findMany({
            where: { userId: session.user.id },
            select: { friendId: true },
          })).map((f) => f.friendId).concat(session.user.id)
        : undefined

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

    const postIds = posts.map((p) => p.id)

    // Batch-fetch current user's likes for these posts
    const myLikes = await db.like.findMany({
      where: { postId: { in: postIds }, userId: session.user.id },
      select: { postId: true, emoji: true },
    })
    const myLikeMap = new Map(myLikes.map((l) => [l.postId, l.emoji]))

    // Batch-fetch reaction summaries (top emojis per post)
    const reactionRows = await db.$queryRawUnsafe<Array<{ postId: string; emoji: string; cnt: bigint }>>(
      `SELECT "postId", COALESCE(emoji, '__plain__') as emoji, COUNT(*) as cnt
       FROM "Like" WHERE "postId" = ANY($1::text[]) AND emoji IS NOT NULL
       GROUP BY "postId", emoji ORDER BY cnt DESC`,
      postIds
    )
    const reactionMapByPost = new Map<string, Array<{ emoji: string; count: number }>>()
    for (const row of reactionRows) {
      if (row.emoji === "__plain__") continue
      let arr = reactionMapByPost.get(row.postId)
      if (!arr) { arr = []; reactionMapByPost.set(row.postId, arr) }
      if (arr.length < 5) arr.push({ emoji: row.emoji, count: Number(row.cnt) })
    }

    return NextResponse.json({
      posts: items.map((p) => {
        const emoji = myLikeMap.get(p.id) || null
        const reactionSummary = reactionMapByPost.get(p.id) || []
        return {
          id: p.id,
          content: p.content,
          images: parseImages(p.images),
          videoUrl: p.videoUrl,
          linkPreview: p.linkPreview ? JSON.parse(p.linkPreview) : null,
          createdAt: p.createdAt,
          author: p.author,
          liked: emoji !== null || myLikeMap.has(p.id),
          emoji,
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

    const { content, images, videoUrl, sharedFromId, linkPreview } = parsed.data

    const post = await db.post.create({
      data: {
        content: content || "",
        images: images?.length ? JSON.stringify(images) : null,
        videoUrl: videoUrl || null,
        sharedFromId: sharedFromId || null,
        linkPreview: linkPreview ? JSON.stringify(linkPreview) : null,
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
        linkPreview: post.linkPreview ? JSON.parse(post.linkPreview) : null,
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
