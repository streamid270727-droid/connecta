import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        location: true,
        birthDate: true,
        phone: true,
        isPrivate: true,
        isVerified: true,
        createdAt: true,
      },
    })
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/users/me error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, bio, location, phone, birthDate, avatarUrl, coverUrl, isPrivate } = body

    const data: any = {}
    if (typeof name === "string" && name.trim().length >= 2) data.name = name.trim()
    if (typeof bio === "string") data.bio = bio.trim().slice(0, 200) || null
    if (typeof location === "string") data.location = location.trim().slice(0, 100) || null
    if (typeof phone === "string") data.phone = phone.trim().slice(0, 30) || null
    if (typeof birthDate === "string" && birthDate) {
      const d = new Date(birthDate)
      if (!isNaN(d.getTime())) data.birthDate = d
    }
    if (typeof avatarUrl === "string") data.avatarUrl = avatarUrl || null
    if (typeof coverUrl === "string") data.coverUrl = coverUrl || null
    if (typeof isPrivate === "boolean") data.isPrivate = isPrivate

    const updated = await db.user.update({
      where: { id: session.user.id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatarUrl: true,
        coverUrl: true,
        bio: true,
        location: true,
        birthDate: true,
        phone: true,
        isPrivate: true,
        isVerified: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error("PUT /api/users/me error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
