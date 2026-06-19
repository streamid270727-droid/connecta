import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params
    const session = await getServerSession(authOptions)
    const viewerId = session?.user?.id

    // Check if viewer can see this profile
    if (viewerId !== userId) {
      const targetUser = await db.user.findUnique({
        where: { id: userId },
        select: { isPrivate: true },
      })
      if (targetUser?.isPrivate) {
        const friendship = await db.friendship.findFirst({
          where: {
            OR: [
              { userId: viewerId, friendId: userId },
              { userId: userId, friendId: viewerId },
            ],
          },
        })
        if (!friendship) {
          return NextResponse.json({ photos: [] })
        }
      }
    }

    // Fetch all posts with images for this user
    const posts = await db.post.findMany({
      where: { authorId: userId, images: { not: "[]" } },
      select: { images: true },
      orderBy: { createdAt: "desc" },
    })

    // Flatten and deduplicate
    const allImages = new Set<string>()
    for (const post of posts) {
      try {
        const parsed = typeof post.images === "string" ? JSON.parse(post.images) : post.images
        if (Array.isArray(parsed)) {
          for (const url of parsed) {
            if (typeof url === "string") allImages.add(url)
          }
        }
      } catch {
        // skip invalid JSON
      }
    }

    return NextResponse.json({ photos: Array.from(allImages) })
  } catch (error) {
    console.error("[PHOTOS GET]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
