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
    const onlyUnread = searchParams.get("unread") === "1"

    // Header badge mode: total unread DMs across all conversations
    if (onlyUnread) {
      const unreadCount = await db.directMessage.count({
        where: {
          recipientId: session.user.id,
          isRead: false,
        },
      })
      return NextResponse.json({ unreadCount })
    }

    // Fetch all conversations the current user participates in
    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { user1Id: session.user.id },
          { user2Id: session.user.id },
        ],
      },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const data = await Promise.all(
      conversations.map(async (c) => {
        const isUser1 = c.user1Id === session.user.id
        const otherUser = isUser1 ? c.user2 : c.user1
        const lastMessage = c.messages[0] ?? null
        const unreadCount = await db.directMessage.count({
          where: {
            conversationId: c.id,
            recipientId: session.user.id,
            isRead: false,
          },
        })
        return {
          id: c.id,
          otherUser,
          lastMessage,
          unreadCount,
          updatedAt: c.updatedAt,
          createdAt: c.createdAt,
        }
      })
    )

    // Sort by last message time desc (fallback to updatedAt when no messages)
    data.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.updatedAt
      const bTime = b.lastMessage?.createdAt ?? b.updatedAt
      return bTime.getTime() - aTime.getTime()
    })

    return NextResponse.json({ conversations: data })
  } catch (error) {
    console.error("GET /api/conversations error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
