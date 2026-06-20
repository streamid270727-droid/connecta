import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { z } from "zod"

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password wajib diisi"),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = deleteAccountSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { password } = parsed.data

    // Get current user with password
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
    }

    // Verify password
    const isValid = await compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: "Password salah" }, { status: 400 })
    }

    // Delete user and all related data (cascading via Prisma)
    await db.user.delete({ where: { id: session.user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("POST /api/users/me/delete error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
