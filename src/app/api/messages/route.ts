import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const sendMessageSchema = z.object({
  conversationId: z.string().min(1, "ID percakapan wajib diisi"),
  content: z
    .string()
    .min(1, "Pesan tidak boleh kosong")
    .max(2000, "Pesan maksimal 2000 karakter"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 30 messages per minute per user
    const { success } = rateLimit(`messages:${session.user.id}`, 30, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak pesan. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = sendMessageSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { conversationId, content } = parsed.data

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

    // DM notifications are handled in real-time via socket only (no DB row)
    // This keeps the notifications table from growing too fast

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
