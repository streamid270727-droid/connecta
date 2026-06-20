import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const rejectRequestSchema = z.object({
  requestId: z.string().min(1, "ID permintaan wajib diisi"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 20 rejects per minute per user
    const { success } = rateLimit(`friend-reject:${session.user.id}`, 20, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = rejectRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { requestId } = parsed.data

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
