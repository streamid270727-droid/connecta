import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// DELETE /api/stories/[id] — delete own story
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    const story = await db.story.findUnique({
      where: { id },
      select: { authorId: true },
    })
    if (!story) {
      return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 })
    }
    if (story.authorId !== session.user.id) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
    }

    await db.story.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/stories/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
