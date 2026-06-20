import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(60).optional(),
  bio: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  phone: z.string().max(30).optional(),
  birthDate: z.string().optional().nullable(),
  avatarUrl: z.string().optional(),
  coverUrl: z.string().optional(),
  isPrivate: z.boolean().optional(),
})

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

    // Rate limit: 10 profile updates per minute per user
    const { success } = rateLimit(`profile:${session.user.id}`, 10, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak perubahan. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, bio, location, phone, birthDate, avatarUrl, coverUrl, isPrivate } = parsed.data

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (bio !== undefined) data.bio = bio.trim() || null
    if (location !== undefined) data.location = location.trim() || null
    if (phone !== undefined) data.phone = phone.trim() || null
    if (birthDate !== undefined) {
      if (birthDate) {
        const d = new Date(birthDate)
        if (!isNaN(d.getTime())) data.birthDate = d
      } else {
        data.birthDate = null
      }
    }
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null
    if (coverUrl !== undefined) data.coverUrl = coverUrl || null
    if (isPrivate !== undefined) data.isPrivate = isPrivate

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
