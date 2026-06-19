import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: conversationId } = await params

    // Validate conversation exists and the user is a participant
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, user1Id: true, user2Id: true },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Percakapan tidak ditemukan" },
        { status: 404 }
      )
    }

    if (
      conversation.user1Id !== session.user.id &&
      conversation.user2Id !== session.user.id
    ) {
      return NextResponse.json(
        { error: "Tidak diizinkan" },
        { status: 403 }
      )
    }

    const otherUserId =
      conversation.user1Id === session.user.id
        ? conversation.user2Id
        : conversation.user1Id

    // Fetch all messages ordered oldest -> newest
    const messages = await db.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
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

    // Mark all unread messages addressed to the current user as read
    await db.directMessage.updateMany({
      where: {
        conversationId,
        recipientId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    })

    // Upsert MessageRead cursor for the current user
    await db.messageRead.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
      update: { lastReadAt: new Date() },
      create: {
        conversationId,
        userId: session.user.id,
        lastReadAt: new Date(),
      },
    })

    // Notify the other participant that messages were read
    try {
      const { emitToUser } = await import("@/lib/socket-server")
      await emitToUser(otherUserId, "dm:read", {
        conversationId,
        readBy: session.user.id,
      })
    } catch (e) {
      console.error("emitToUser dm:read error:", e)
    }

    const data = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      recipientId: m.recipientId,
      content: m.content,
      isRead: m.isRead,
      createdAt: m.createdAt,
      sender: m.sender,
    }))

    return NextResponse.json({ messages: data })
  } catch (error) {
    console.error("GET /api/conversations/[id]/messages error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
