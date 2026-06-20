import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const reactionSchema = z.object({
  emoji: z.string().min(1).max(4),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id: storyId } = await params

    // Rate limit: 20 reactions per minute per user
    const { success } = rateLimit(`story-reactions:${session.user.id}`, 20, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = reactionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const story = await db.story.findUnique({ where: { id: storyId }, select: { authorId: true } })
    if (!story) {
      return NextResponse.json({ error: "Story tidak ditemukan" }, { status: 404 })
    }

    // Upsert reaction
    const existing = await db.storyReaction.findUnique({
      where: { storyId_userId: { storyId, userId: session.user.id } },
    })

    let reaction
    let action: "added" | "removed" | "updated"

    if (existing) {
      if (existing.emoji === parsed.data.emoji) {
        // Toggle off
        await db.storyReaction.delete({ where: { id: existing.id } })
        return NextResponse.json({ action: "removed", emoji: null })
      }
      // Update emoji
      reaction = await db.storyReaction.update({
        where: { id: existing.id },
        data: { emoji: parsed.data.emoji },
      })
      action = "updated"
    } else {
      reaction = await db.storyReaction.create({
        data: {
          storyId,
          userId: session.user.id,
          emoji: parsed.data.emoji,
        },
      })
      action = "added"
    }

    // Notify story author
    if (story.authorId !== session.user.id) {
      try {
        const { notifyUser } = await import("@/lib/socket-server")
        await notifyUser(story.authorId, {
          title: "Story reaction",
          body: `${session.user.name} bereaksi "${parsed.data.emoji}" ke story Anda`,
          type: "story_reaction",
          entityId: storyId,
        })
      } catch (e) {
        console.error("Failed to send story reaction notification:", e)
      }
    }

    return NextResponse.json({ action, emoji: reaction.emoji })
  } catch (error) {
    console.error("POST /api/stories/[id]/react error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
