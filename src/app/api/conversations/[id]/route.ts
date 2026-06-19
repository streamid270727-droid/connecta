import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: otherUserId } = await params

    if (otherUserId === session.user.id) {
      return NextResponse.json(
        { error: "Tidak dapat membuat percakapan dengan diri sendiri" },
        { status: 400 }
      )
    }

    // Validate the other user exists
    const otherUser = await db.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        isVerified: true,
      },
    })
    if (!otherUser) {
      return NextResponse.json(
        { error: "Pengguna tidak ditemukan" },
        { status: 404 }
      )
    }

    // Convention: user1Id is the lexicographically smaller ID to satisfy
    // the unique constraint [user1Id, user2Id] regardless of who initiates.
    const currentId = session.user.id
    const [user1Id, user2Id] =
      currentId < otherUserId ? [currentId, otherUserId] : [otherUserId, currentId]

    const conversation = await db.conversation.upsert({
      where: {
        user1Id_user2Id: { user1Id, user2Id },
      },
      update: {},
      create: { user1Id, user2Id },
      select: { id: true },
    })

    return NextResponse.json({ conversationId: conversation.id, otherUser })
  } catch (error) {
    console.error("POST /api/conversations/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
