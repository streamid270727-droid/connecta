import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const acceptRequestSchema = z.object({
  requestId: z.string().min(1, "ID permintaan wajib diisi"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 20 accepts per minute per user
    const { success } = rateLimit(`friend-accept:${session.user.id}`, 20, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = acceptRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { requestId } = parsed.data

    const friendRequest = await db.friendRequest.findUnique({
      where: { id: requestId },
      select: { id: true, senderId: true, recipientId: true, status: true },
    })

    if (!friendRequest) {
      return NextResponse.json(
        { error: "Permintaan tidak ditemukan" },
        { status: 404 }
      )
    }

    if (friendRequest.recipientId !== session.user.id) {
      return NextResponse.json(
        { error: "Tidak diizinkan" },
        { status: 403 }
      )
    }

    if (friendRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Permintaan sudah tidak dapat diproses" },
        { status: 400 }
      )
    }

    // Update request status + create bidirectional friendship
    await db.$transaction([
      db.friendRequest.update({
        where: { id: requestId },
        data: { status: "accepted" },
      }),
      db.friendship.create({
        data: {
          userId: session.user.id,
          friendId: friendRequest.senderId,
        },
      }),
      db.friendship.create({
        data: {
          userId: friendRequest.senderId,
          friendId: session.user.id,
        },
      }),
    ])

    // Create notification for sender
    const currentName = session.user.name || "Seseorang"
    await db.notification.create({
      data: {
        recipientId: friendRequest.senderId,
        actorId: session.user.id,
        type: "friend_accept",
        entityId: requestId,
        content: "menerima permintaan pertemanan Anda",
        isRead: false,
      },
    })

    // Push real-time notification to sender
    try {
      const { notifyUser } = await import("@/lib/socket-server")
      await notifyUser(friendRequest.senderId, {
        title: "Permintaan diterima",
        body: `${currentName} menerima permintaan pertemanan Anda`,
        type: "friend_accept",
      })
    } catch (e) {
      console.error("notifyUser error:", e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/friends/accept error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
