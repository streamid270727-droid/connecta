import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseImages } from "@/lib/format"

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

    // Support both userId and username lookup
    const isCuid = /^c[a-z0-9]{20,}$/.test(id)
    const user = await db.user.findUnique({
      where: isCuid ? { id } : { username: id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        location: true,
        birthDate: true,
        phone: true,
        isPrivate: true,
        isVerified: true,
        createdAt: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    const userId = user.id

    // Friend status
    const isFriend = await db.friendship.findUnique({
      where: {
        userId_friendId: { userId: session.user.id, friendId: userId },
      },
    })

    const sentRequest = await db.friendRequest.findFirst({
      where: { senderId: session.user.id, recipientId: userId, status: "pending" },
    })
    const recvRequest = await db.friendRequest.findFirst({
      where: { senderId: userId, recipientId: session.user.id, status: "pending" },
    })

    // Counts
    const friendsCount = await db.friendship.count({ where: { userId } })
    const postsCount = await db.post.count({ where: { authorId: userId } })

    // Recent posts (paginated via query param)
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get("cursor")
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20)

    const posts = await db.post.findMany({
      where: { authorId: userId },
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
        _count: { select: { likes: true, comments: true, shares: true } },
        likes: { select: { userId: true, emoji: true } },
        shares: { where: { userId: session.user.id }, select: { id: true } },
        savedBy: { where: { userId: session.user.id }, select: { id: true } },
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

    // Friends list (only if current user is friend OR viewing own profile)
    let friends: any[] = []
    if (isFriend || userId === session.user.id) {
      const friendships = await db.friendship.findMany({
        where: { userId },
        take: 12,
        select: {
          friend: {
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
      friends = friendships.map((f) => f.friend)
    }

    return NextResponse.json({
      user: {
        ...user,
        isOwnProfile: userId === session.user.id,
        isFriend: !!isFriend,
        friendRequestSent: !!sentRequest,
        friendRequestReceived: !!recvRequest,
        requestId: recvRequest?.id || sentRequest?.id || null,
        friendsCount,
        postsCount,
      },
      friends,
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
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (error) {
    console.error("GET /api/users/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
