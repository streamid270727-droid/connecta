import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// POST /api/stories/[id]/view — mark a story as viewed by current user
export async function POST(
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
      select: { id: true, authorId: true },
    })
    if (!story) {
      return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 })
    }

    // Upsert view (unique on storyId + userId)
    await db.storyView.upsert({
      where: {
        storyId_userId: { storyId: id, userId: session.user.id },
      },
      update: { viewedAt: new Date() },
      create: { storyId: id, userId: session.user.id },
    })

    const viewCount = await db.storyView.count({ where: { storyId: id } })

    return NextResponse.json({ success: true, viewCount })
  } catch (error) {
    console.error("POST /api/stories/[id]/view error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
