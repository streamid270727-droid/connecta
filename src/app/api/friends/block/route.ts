import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const blockSchema = z.object({
  userId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    // Rate limit: 10 block actions per minute per user
    const { success } = rateLimit(`block:${session.user.id}`, 10, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = blockSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { userId } = parsed.data
    if (userId === session.user.id) {
      return NextResponse.json({ error: "Tidak bisa memblokir diri sendiri" }, { status: 400 })
    }

    // Check if already blocked
    const existing = await db.blockedUser.findUnique({
      where: { blockerId_blockedId: { blockerId: session.user.id, blockedId: userId } },
    })

    if (existing) {
      // Unblock
      await db.blockedUser.delete({ where: { id: existing.id } })
      // Also remove friendship if exists
      await db.friendship.deleteMany({
        where: {
          OR: [
            { userId: session.user.id, friendId: userId },
            { userId: userId, friendId: session.user.id },
          ],
        },
      })
      return NextResponse.json({ blocked: false })
    }

    // Block
    await db.blockedUser.create({
      data: { blockerId: session.user.id, blockedId: userId },
    })
    // Remove friendship if exists
    await db.friendship.deleteMany({
      where: {
        OR: [
          { userId: session.user.id, friendId: userId },
          { userId: userId, friendId: session.user.id },
        ],
      },
    })
    // Cancel pending friend requests
    await db.friendRequest.deleteMany({
      where: {
        OR: [
          { senderId: session.user.id, recipientId: userId },
          { senderId: userId, recipientId: session.user.id },
        ],
      },
    })

    return NextResponse.json({ blocked: true })
  } catch (error) {
    console.error("POST /api/friends/block error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
