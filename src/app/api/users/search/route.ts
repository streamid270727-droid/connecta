import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") || "").trim().toLowerCase()
    if (q.length < 1) {
      return NextResponse.json({ users: [], posts: [] })
    }

    // Get current user's friends to mark isFriend
    const friendships = await db.friendship.findMany({
      where: { userId: session.user.id },
      select: { friendId: true },
    })
    const friendIds = new Set(friendships.map((f) => f.friendId))

    // Get pending requests to mark status
    const sentRequests = await db.friendRequest.findMany({
      where: { senderId: session.user.id, status: "pending" },
      select: { recipientId: true },
    })
    const sentIds = new Set(sentRequests.map((r) => r.recipientId))

    const recvRequests = await db.friendRequest.findMany({
      where: { recipientId: session.user.id, status: "pending" },
      select: { senderId: true },
    })
    const recvIds = new Set(recvRequests.map((r) => r.senderId))

    // Search users
    const users = await db.user.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { email: { contains: q } },
        ],
        id: { not: session.user.id },
      },
      take: 20,
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
      },
    })

    // Search posts
    const posts = await db.post.findMany({
      where: {
        content: { contains: q },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
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

    return NextResponse.json({
      users: users.map((u) => ({
        ...u,
        isFriend: friendIds.has(u.id),
        requestSent: sentIds.has(u.id),
        requestReceived: recvIds.has(u.id),
      })),
      posts: posts.map((p) => ({
        id: p.id,
        content: p.content,
        createdAt: p.createdAt,
        author: p.author,
        _count: p._count,
      })),
    })
  } catch (error) {
    console.error("GET /api/users/search error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
