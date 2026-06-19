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
    const cursor = searchParams.get("cursor")

    if (onlyCount) {
      const [count, unreadCount] = await Promise.all([
        db.notification.count({
          where: { recipientId: session.user.id },
        }),
        db.notification.count({
          where: {
            recipientId: session.user.id,
            isRead: false,
          },
        }),
      ])
      return NextResponse.json({ count, unreadCount })
    }

    const notifications = await db.notification.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 21, // fetch one extra to know if there's more
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    })

    const hasMore = notifications.length > 20
    const items = hasMore ? notifications.slice(0, 20) : notifications
    const nextCursor = hasMore ? items[items.length - 1].id : null

    const data = items.map((n) => ({
      id: n.id,
      type: n.type,
      entityId: n.entityId,
      content: n.content,
      isRead: n.isRead,
      createdAt: n.createdAt,
      actor: n.actor,
    }))

    return NextResponse.json({ notifications: data, count: data.length, nextCursor })
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
