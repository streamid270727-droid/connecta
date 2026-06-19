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
    const onlyCount = searchParams.get("count") === "1"

    if (onlyCount) {
      const count = await db.friendship.count({
        where: { userId: session.user.id },
      })
      return NextResponse.json({ count })
    }

    const friendships = await db.friendship.findMany({
      where: { userId: session.user.id },
      include: {
        friend: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const friends = friendships.map((f) => ({
      id: f.friend.id,
      name: f.friend.name,
      username: f.friend.username,
      avatarUrl: f.friend.avatarUrl,
      bio: f.friend.bio,
      isVerified: f.friend.isVerified,
      friendedAt: f.createdAt,
    }))

    return NextResponse.json({ friends, count: friends.length })
  } catch (error) {
    console.error("GET /api/friends error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
