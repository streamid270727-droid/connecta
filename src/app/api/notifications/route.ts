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
      take: 50,
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

    const data = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      entityId: n.entityId,
      content: n.content,
      isRead: n.isRead,
      createdAt: n.createdAt,
      actor: n.actor,
    }))

    return NextResponse.json({ notifications: data, count: data.length })
  } catch (error) {
    console.error("GET /api/notifications error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
