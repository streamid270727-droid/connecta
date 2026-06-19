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
    const { recipientId } = body as { recipientId?: string }

    if (!recipientId || typeof recipientId !== "string") {
      return NextResponse.json(
        { error: "ID penerima wajib diisi" },
        { status: 400 }
      )
    }

    if (recipientId === session.user.id) {
      return NextResponse.json(
        { error: "Tidak dapat mengirim permintaan ke diri sendiri" },
        { status: 400 }
      )
    }

    // Validate recipient exists
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
      select: { id: true, name: true },
    })
    if (!recipient) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 404 }
      )
    }

    // Check if already friends
    const existingFriendship = await db.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: session.user.id,
          friendId: recipientId,
        },
      },
    })
    if (existingFriendship) {
      return NextResponse.json(
        { error: "Kalian sudah berteman" },
        { status: 400 }
      )
    }

    // Check existing pending request sent by current user -> recipient
    const outgoingPending = await db.friendRequest.findUnique({
      where: {
        senderId_recipientId: {
          senderId: session.user.id,
          recipientId,
        },
      },
    })
    if (outgoingPending && outgoingPending.status === "pending") {
      return NextResponse.json(
        { error: "Permintaan pertemanan sudah dikirim" },
        { status: 400 }
      )
    }

    // Check if recipient already sent a request to current user -> auto-accept
    const incomingPending = await db.friendRequest.findUnique({
      where: {
        senderId_recipientId: {
          senderId: recipientId,
          recipientId: session.user.id,
        },
      },
    })

    if (incomingPending && incomingPending.status === "pending") {
      // Auto-accept: create bidirectional friendship and mark request accepted
      await db.$transaction([
        db.friendRequest.update({
          where: { id: incomingPending.id },
          data: { status: "accepted" },
        }),
        db.friendship.create({
          data: { userId: session.user.id, friendId: recipientId },
        }),
        db.friendship.create({
          data: { userId: recipientId, friendId: session.user.id },
        }),
      ])

      return NextResponse.json({ status: "friends" })
    }

    // Create new pending friend request
    const friendRequest = await db.friendRequest.create({
      data: {
        senderId: session.user.id,
        recipientId,
        status: "pending",
      },
    })

    // Create notification for recipient
    const senderName = session.user.name || "Seseorang"
    await db.notification.create({
      data: {
        recipientId,
        actorId: session.user.id,
        type: "friend_request",
        entityId: friendRequest.id,
        content: "mengirimi Anda permintaan pertemanan",
        isRead: false,
      },
    })

    // Push real-time notification
    try {
      const { notifyUser } = await import("@/lib/socket-server")
      await notifyUser(recipientId, {
        title: "Permintaan teman baru",
        body: `${senderName} mengirimi Anda permintaan pertemanan`,
        type: "friend_request",
        entityId: friendRequest.id,
      })
    } catch (e) {
      console.error("notifyUser error:", e)
    }

    return NextResponse.json({ status: "pending" })
  } catch (error) {
    console.error("POST /api/friends/request error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
