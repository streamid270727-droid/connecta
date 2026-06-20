import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadImage } from "@/lib/cloudinary"
import { rateLimit } from "@/lib/rate-limit"

const MAX_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { success } = rateLimit(`upload:${session.user.id}`, 10, 60000)
    if (!success) {
      return NextResponse.json({ error: "Terlalu banyak upload. Coba lagi dalam 1 menit." }, { status: 429 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Gunakan JPG, PNG, WebP, atau GIF." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Ukuran file terlalu besar. Maksimal 4MB." },
        { status: 400 }
      )
    }

    const { url } = await uploadImage(file, "connecta")

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Gagal mengunggah file" }, { status: 500 })
  }
}
