import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    if (id === session.user.id) {
      return NextResponse.json(
        { error: "Tidak dapat menghapus diri sendiri" },
        { status: 400 }
      )
    }

    // Verify friendship exists in current->friend direction
    const friendship = await db.friendship.findUnique({
      where: {
        userId_friendId: {
          userId: session.user.id,
          friendId: id,
        },
      },
      select: { id: true },
    })

    if (!friendship) {
      return NextResponse.json(
        { error: "Pertemanan tidak ditemukan" },
        { status: 404 }
      )
    }

    // Delete both friendship rows (bidirectional)
    await db.$transaction([
      db.friendship.deleteMany({
        where: {
          OR: [
            { userId: session.user.id, friendId: id },
            { userId: id, friendId: session.user.id },
          ],
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/friends/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
