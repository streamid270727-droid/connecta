import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, content } = body as {
      conversationId?: string
      content?: string
    }

    if (!conversationId || typeof conversationId !== "string") {
      return NextResponse.json(
        { error: "ID percakapan wajib diisi" },
        { status: 400 }
      )
    }

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong" },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Pesan maksimal 2000 karakter" },
        { status: 400 }
      )
    }

    // Validate conversation exists and the current user is a participant
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

    // Determine the recipient (the OTHER user in the conversation)
    const recipientId =
      conversation.user1Id === session.user.id
        ? conversation.user2Id
        : conversation.user1Id

    // Create the direct message (unread initially)
    const message = await db.directMessage.create({
      data: {
        conversationId,
        senderId: session.user.id,
        recipientId,
        content: content.trim(),
        isRead: false,
      },
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

    // Bump conversation's updatedAt so it floats to the top of the list
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    })

    // Sender just sent a message so they have read everything up to now
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

    const senderName = session.user.name || "Seseorang"

    // Push real-time events to the recipient (best-effort)
    try {
      const { emitToUser, notifyUser } = await import("@/lib/socket-server")
      await emitToUser(recipientId, "dm:message", {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName,
        content: message.content,
        createdAt: message.createdAt,
      })
      await notifyUser(recipientId, {
        title: "Pesan baru",
        body: `${senderName}: ${message.content.slice(0, 50)}`,
        type: "message",
        entityId: conversationId,
      })
    } catch (e) {
      console.error("socket emit error:", e)
    }

    // Persist a notification row for the recipient
    await db.notification.create({
      data: {
        recipientId,
        actorId: session.user.id,
        type: "message",
        entityId: conversationId,
        content: "mengirimi Anda pesan",
        isRead: false,
      },
    })

    return NextResponse.json({
      message: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        recipientId: message.recipientId,
        content: message.content,
        isRead: message.isRead,
        createdAt: message.createdAt,
        sender: message.sender,
      },
    })
  } catch (error) {
    console.error("POST /api/messages error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
