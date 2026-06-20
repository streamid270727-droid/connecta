import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { db } from "@/lib/db"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const reports = await db.report.findMany({
      include: {
        reporter: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ reports })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
