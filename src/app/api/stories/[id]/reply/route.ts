import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const replySchema = z.object({
  content: z.string().min(1, "Pesan tidak boleh kosong").max(500, "Pesan terlalu panjang"),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id: storyId } = await params
    const body = await request.json()
    const parsed = replySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const story = await db.story.findUnique({ where: { id: storyId }, select: { authorId: true } })
    if (!story) {
      return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 })
    }

    const senderId = session.user.id
    const recipientId = story.authorId

    // Save story reply
    const reply = await db.storyReply.create({
      data: {
        storyId,
        senderId,
        content: parsed.data.content,
      },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    })

    // Also send as DM to the story author
    if (senderId !== recipientId) {
      // Find or create conversation
      const [u1, u2] = [senderId, recipientId].sort()
      let conversation = await db.conversation.findUnique({
        where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } },
        select: { id: true },
      })
      if (!conversation) {
        conversation = await db.conversation.create({
          data: { user1Id: u1, user2Id: u2 },
          select: { id: true },
        })
      }

      const dmContent = `📹 ${parsed.data.content}`

      // Create DM
      const message = await db.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId,
          recipientId,
          content: dmContent,
          isRead: false,
        },
      })

      // Bump conversation
      await db.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })

      // Mark sender as read
      await db.messageRead.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId: senderId } },
        update: { lastReadAt: new Date() },
        create: { conversationId: conversation.id, userId: senderId, lastReadAt: new Date() },
      })

      // Real-time push
      try {
        const { emitToUser, notifyUser } = await import("@/lib/socket-server")
        await emitToUser(recipientId, "dm:message", {
          id: message.id,
          conversationId: conversation.id,
          senderId,
          senderName: session.user.name || "Seseorang",
          content: dmContent,
          createdAt: message.createdAt,
        })
        await notifyUser(recipientId, {
          title: "Balasan story",
          body: `${session.user.name}: ${dmContent.slice(0, 50)}`,
          type: "message",
          entityId: conversation.id,
        })
      } catch {}
    }

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("POST /api/stories/[id]/reply error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
