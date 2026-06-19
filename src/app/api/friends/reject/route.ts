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
    const { requestId } = body as { requestId?: string }

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json(
        { error: "ID permintaan wajib diisi" },
        { status: 400 }
      )
    }

    const friendRequest = await db.friendRequest.findUnique({
      where: { id: requestId },
      select: { id: true, recipientId: true, status: true },
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

    await db.friendRequest.delete({ where: { id: requestId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/friends/reject error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
