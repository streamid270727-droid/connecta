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

    // For each friend, find their most recent activity (post or message)
    const friendsWithActivity = await Promise.all(
      friendships.map(async (f) => {
        const lastPost = await db.post.findFirst({
          where: { authorId: f.friend.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
        const lastMsg = await db.directMessage.findFirst({
          where: { senderId: f.friend.id },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
        const lastActivity = lastPost && lastMsg
          ? (lastPost.createdAt > lastMsg.createdAt ? lastPost.createdAt : lastMsg.createdAt)
          : lastPost?.createdAt || lastMsg?.createdAt || new Date(0)
        return {
          ...f.friend,
          lastActivity,
        }
      })
    )

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
