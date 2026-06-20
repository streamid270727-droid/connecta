import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { db } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status || !["pending", "reviewed", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 })
    }

    const report = await db.report.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    })

    return NextResponse.json({ report })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
