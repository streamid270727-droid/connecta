import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export type SafeUser = {
  id: string
  name: string
  username: string
  email: string
  avatarUrl: string | null
  coverUrl: string | null
  bio: string | null
  location: string | null
  birthDate: Date | null
  phone: string | null
  isPrivate: boolean
  isVerified: boolean
  createdAt: Date
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
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
  return user
}

export type { SafeUser as CurrentUser }
