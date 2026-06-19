import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const onlyCount = searchParams.get("count") === "1"

    if (onlyCount) {
      const count = await db.friendRequest.count({
        where: {
          recipientId: session.user.id,
          status: "pending",
        },
      })
      return NextResponse.json({ count })
    }

    const requests = await db.friendRequest.findMany({
      where: {
        recipientId: session.user.id,
        status: "pending",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
            isVerified: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const data = requests.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      status: r.status,
      createdAt: r.createdAt,
      sender: r.sender,
    }))

    return NextResponse.json({ requests: data, count: data.length })
  } catch (error) {
    console.error("GET /api/friends/requests error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
