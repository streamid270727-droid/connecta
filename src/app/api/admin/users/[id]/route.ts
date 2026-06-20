import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin"
import { db } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { id } = await params
    const body = await request.json()
    const { role, isVerified, isPrivate } = body

    const updateData: Record<string, unknown> = {}
    if (role !== undefined) updateData.role = role
    if (isVerified !== undefined) updateData.isVerified = isVerified
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diperbarui" }, { status: 400 })
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, username: true, role: true, isVerified: true },
    })

    return NextResponse.json({ user })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { id } = await params
    const adminUser = await requireAdmin()
    if (adminUser.user?.id === id) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 })
    }

    await db.user.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 })
  }
}
