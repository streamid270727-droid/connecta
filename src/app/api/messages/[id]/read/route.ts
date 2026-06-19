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

    const { id: messageId } = await params

    const message = await db.directMessage.findUnique({
      where: { id: messageId },
      select: { id: true, recipientId: true, isRead: true },
    })

    if (!message) {
      return NextResponse.json(
        { error: "Pesan tidak ditemukan" },
        { status: 404 }
      )
    }

    if (message.recipientId !== session.user.id) {
      return NextResponse.json(
        { error: "Tidak diizinkan" },
        { status: 403 }
      )
    }

    if (!message.isRead) {
      await db.directMessage.update({
        where: { id: messageId },
        data: { isRead: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/messages/[id]/read error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
