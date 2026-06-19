import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseImages } from "@/lib/format"

// GET /api/posts/saved — returns all posts saved/bookmarked by the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const saved = await db.savedPost.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
            _count: { select: { likes: true, comments: true, shares: true } },
            likes: { where: { userId: session.user.id }, select: { id: true } },
            shares: { where: { userId: session.user.id }, select: { id: true } },
            sharedFrom: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatarUrl: true,
                    isVerified: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      posts: saved.map((s) => ({
        id: s.post.id,
        content: s.post.content,
        images: parseImages(s.post.images),
        videoUrl: s.post.videoUrl,
        createdAt: s.post.createdAt,
        author: s.post.author,
        liked: s.post.likes.length > 0,
        shared: s.post.shares.length > 0,
        saved: true,
        savedAt: s.createdAt,
        _count: s.post._count,
        sharedFrom: s.post.sharedFrom
          ? {
              id: s.post.sharedFrom.id,
              content: s.post.sharedFrom.content,
              images: parseImages(s.post.sharedFrom.images),
              videoUrl: s.post.sharedFrom.videoUrl,
              createdAt: s.post.sharedFrom.createdAt,
              author: s.post.sharedFrom.author,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error("GET /api/posts/saved error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
