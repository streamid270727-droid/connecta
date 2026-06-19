import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

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

    const post = await db.post.findUnique({
      where: { id },
      select: { authorId: true },
    })
    if (!post) {
      return NextResponse.json({ error: "Postingan tidak ditemukan" }, { status: 404 })
    }
    if (post.authorId !== session.user.id) {
      return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 })
    }

    await db.post.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/posts/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const { id } = await params

    const post = await db.post.findUnique({
      where: { id },
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
    })
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    const { parseImages } = await import("@/lib/format")
    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        images: parseImages(post.images),
        videoUrl: post.videoUrl,
        createdAt: post.createdAt,
        author: post.author,
        liked: post.likes.length > 0,
        shared: post.shares.length > 0,
        _count: post._count,
        sharedFrom: post.sharedFrom
          ? {
              id: post.sharedFrom.id,
              content: post.sharedFrom.content,
              images: parseImages(post.sharedFrom.images),
              videoUrl: post.sharedFrom.videoUrl,
              createdAt: post.sharedFrom.createdAt,
              author: post.sharedFrom.author,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("GET /api/posts/[id] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
