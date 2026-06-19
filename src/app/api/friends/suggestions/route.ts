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

    const currentUserId = session.user.id

    // Get current user's friends (the friendId column for friendships where userId = me)
    const myFriendships = await db.friendship.findMany({
      where: { userId: currentUserId },
      select: { friendId: true },
    })
    const myFriendIds = new Set(myFriendships.map((f) => f.friendId))

    // Get all pending friend requests involving me (either direction)
    const pendingRequests = await db.friendRequest.findMany({
      where: {
        status: "pending",
        OR: [{ senderId: currentUserId }, { recipientId: currentUserId }],
      },
      select: { senderId: true, recipientId: true },
    })
    const pendingUserIds = new Set<string>()
    for (const r of pendingRequests) {
      if (r.senderId !== currentUserId) pendingUserIds.add(r.senderId)
      if (r.recipientId !== currentUserId) pendingUserIds.add(r.recipientId)
    }

    // Fetch candidate users: not me, not friends, not pending
    // We'll fetch up to 50 candidates, then filter and compute mutual friends
    const candidates = await db.user.findMany({
      where: {
        id: { not: currentUserId },
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        friendsOf: {
          where: { userId: currentUserId },
          select: { id: true },
        },
      },
      take: 100,
    })

    // Filter out friends and pending-request users
    const eligible = candidates.filter(
      (c) =>
        !myFriendIds.has(c.id) &&
        !pendingUserIds.has(c.id) &&
        c.friendsOf.length === 0
    )

    // For computing mutual friends: need friends list of each candidate
    // Limit work to first 30 eligible users to keep performance reasonable
    const topEligible = eligible.slice(0, 30)

    const suggestions: Array<{
      id: string
      name: string
      username: string
      avatarUrl: string | null
      bio: string | null
      mutualFriends: number
    }> = []

    for (const c of topEligible) {
      // Get candidate's friend ids
      const candidateFriendships = await db.friendship.findMany({
        where: { userId: c.id },
        select: { friendId: true },
      })
      const candidateFriendIds = new Set(
        candidateFriendships.map((f) => f.friendId)
      )
      // Mutual = intersection of myFriendIds and candidateFriendIds
      let mutual = 0
      for (const fid of myFriendIds) {
        if (candidateFriendIds.has(fid)) mutual++
      }
      suggestions.push({
        id: c.id,
        name: c.name,
        username: c.username,
        avatarUrl: c.avatarUrl,
        bio: c.bio,
        mutualFriends: mutual,
      })
    }

    // Sort by mutual friends desc, then name asc, take 10
    suggestions.sort((a, b) => {
      if (b.mutualFriends !== a.mutualFriends) {
        return b.mutualFriends - a.mutualFriends
      }
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ suggestions: suggestions.slice(0, 10) })
  } catch (error) {
    console.error("GET /api/friends/suggestions error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
