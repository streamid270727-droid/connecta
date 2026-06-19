import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/stories — returns active stories (not expired) from current user + friends
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // Get friend ids
    const friendships = await db.friendship.findMany({
      where: { userId: session.user.id },
      select: { friendId: true },
    })
    const authorIds = [...friendships.map((f) => f.friendId), session.user.id]

    // Get active stories
    const stories = await db.story.findMany({
      where: {
        authorId: { in: authorIds },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
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
        views: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        _count: { select: { views: true } },
      },
    })

    // Group by author
    const byAuthor = new Map<string, {
      author: any
      stories: any[]
      hasUnviewed: boolean
    }>()

    for (const s of stories) {
      const existing = byAuthor.get(s.authorId)
      const storyData = {
        id: s.id,
        mediaUrl: s.mediaUrl,
        content: s.content,
        bgColor: s.bgColor,
        textColor: s.textColor,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        viewed: s.views.length > 0,
        viewCount: s._count.views,
      }
      if (existing) {
        existing.stories.push(storyData)
        if (!storyData.viewed) existing.hasUnviewed = true
      } else {
        byAuthor.set(s.authorId, {
          author: s.author,
          stories: [storyData],
          hasUnviewed: !storyData.viewed,
        })
      }
    }

    // Current user's stories first, then friends sorted by most recent
    const groups = Array.from(byAuthor.values()).sort((a, b) => {
      if (a.author.id === session.user.id) return -1
      if (b.author.id === session.user.id) return 1
      const aTime = a.stories[0]?.createdAt?.getTime() || 0
      const bTime = b.stories[0]?.createdAt?.getTime() || 0
      return bTime - aTime
    })

    return NextResponse.json({ groups })
  } catch (error) {
    console.error("GET /api/stories error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST /api/stories — create a new story
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { mediaUrl, content, bgColor, textColor } = body

    if (!mediaUrl && !content) {
      return NextResponse.json(
        { error: "Story tidak boleh kosong" },
        { status: 400 }
      )
    }

    if (content && content.length > 280) {
      return NextResponse.json(
        { error: "Teks story maksimal 280 karakter" },
        { status: 400 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24h

    const story = await db.story.create({
      data: {
        authorId: session.user.id,
        mediaUrl: mediaUrl || null,
        content: content || null,
        bgColor: bgColor || null,
        textColor: textColor || "#ffffff",
        expiresAt,
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

    return NextResponse.json({ story })
  } catch (error) {
    console.error("POST /api/stories error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
