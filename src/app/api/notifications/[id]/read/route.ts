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

    const { id } = await params

    const notification = await db.notification.findUnique({
      where: { id },
      select: { id: true, recipientId: true },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notifikasi tidak ditemukan" },
        { status: 404 }
      )
    }

    if (notification.recipientId !== session.user.id) {
      return NextResponse.json(
        { error: "Tidak diizinkan" },
        { status: 403 }
      )
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/notifications/[id]/read error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
