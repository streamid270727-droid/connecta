import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const reportSchema = z.object({
  targetId: z.string().min(1),
  targetType: z.enum(["post", "comment", "user"]),
  reason: z.string().min(1, "Alasan wajib diisi").max(500),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = reportSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { targetId, targetType, reason } = parsed.data

    // Check for duplicate report
    const existing = await db.report.findFirst({
      where: {
        reporterId: session.user.id,
        targetId,
        targetType,
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Anda sudah melaporkan ini" }, { status: 400 })
    }

    await db.report.create({
      data: {
        reporterId: session.user.id,
        targetId,
        targetType,
        reason,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/reports error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
