import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/users/online — returns friends who are "online" (for MVP, we approximate by recent activity)
// In a real app this would check the socket presence map. Here we return friends
// sorted by most recent message/post activity to simulate "active now".
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const friendships = await db.friendship.findMany({
      where: { userId: session.user.id },
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

    const friendIds = friendships.map((f) => f.friend.id)

    // Batch-fetch last post and last message for all friends (2 queries instead of 2N)
    const [lastPosts, lastMsgs] = await Promise.all([
      db.$queryRawUnsafe<{ authorId: string; maxCreated: Date }[]>(
        `SELECT "authorId", MAX("createdAt") as "maxCreated" FROM "Post" WHERE "authorId" = ANY($1::text[]) GROUP BY "authorId"`,
        friendIds
      ),
      db.$queryRawUnsafe<{ senderId: string; maxCreated: Date }[]>(
        `SELECT "senderId", MAX("createdAt") as "maxCreated" FROM "DirectMessage" WHERE "senderId" = ANY($1::text[]) GROUP BY "senderId"`,
        friendIds
      ),
    ])

    const lastPostMap = new Map(lastPosts.map((p) => [p.authorId, p.maxCreated]))
    const lastMsgMap = new Map(lastMsgs.map((m) => [m.senderId, m.maxCreated]))

    const friendsWithActivity = friendships.map((f) => {
      const lastPost = lastPostMap.get(f.friend.id)
      const lastMsg = lastMsgMap.get(f.friend.id)
      const lastActivity = lastPost && lastMsg
        ? (lastPost > lastMsg ? lastPost : lastMsg)
        : lastPost || lastMsg || new Date(0)
      return {
        ...f.friend,
        lastActivity,
      }
    })

    // Sort by most recent activity, take top 6
    const online = friendsWithActivity
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .slice(0, 6)
      .map((f) => ({
        id: f.id,
        name: f.name,
        username: f.username,
        avatarUrl: f.avatarUrl,
        isVerified: f.isVerified,
      }))

    return NextResponse.json({ users: online })
  } catch (error) {
    console.error("GET /api/users/online error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
