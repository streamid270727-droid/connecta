import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(60),
  username: z
    .string()
    .min(3, "Username minimal 3 karakter")
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya boleh huruf, angka, titik, dan underscore"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues?.[0]?.message || "Data tidak valid"
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      )
    }

    const { name, username, email, password } = parsed.data
    const emailLower = email.toLowerCase().trim()
    const usernameLower = username.toLowerCase().trim()

    const existing = await db.user.findFirst({
      where: {
        OR: [{ email: emailLower }, { username: usernameLower }],
      },
    })
    if (existing) {
      if (existing.email === emailLower) {
        return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 })
      }
      return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 })
    }

    const hashedPassword = await hash(password, 12)
    const user = await db.user.create({
      data: {
        name: name.trim(),
        username: usernameLower,
        email: emailLower,
        password: hashedPassword,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
