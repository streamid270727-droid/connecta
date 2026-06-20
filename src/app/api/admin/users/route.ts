import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { db } from "@/lib/db"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        isPrivate: true,
        createdAt: true,
        _count: {
          select: { posts: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ users })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
