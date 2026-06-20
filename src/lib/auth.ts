import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"

async function getUserWithEmail(email: string) {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    "SELECT id, email, name, password, avatarUrl, username, isVerified, role FROM User WHERE email = ?",
    email
  )
  return rows[0] ?? null
}

async function getUserWithId(id: string) {
  const rows = await db.$queryRawUnsafe<Array<Record<string, unknown>>>(
    "SELECT id, avatarUrl, name, role FROM User WHERE id = ?",
    id
  )
  return rows[0] ?? null
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan kata sandi wajib diisi")
        }
        const email = credentials.email.toLowerCase().trim()
        const user = await getUserWithEmail(email)
        if (!user) {
          throw new Error("Email tidak terdaftar")
        }
        const isValid = await compare(credentials.password, user.password as string)
        if (!isValid) {
          throw new Error("Kata sandi salah")
        }
        return {
          id: user.id as string,
          email: user.email as string,
          name: user.name as string,
          image: (user.avatarUrl as string) || null,
          username: user.username as string,
          isVerified: user.isVerified as boolean,
          role: (user.role as string) || "user",
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.username = (user as { username?: string }).username
        token.isVerified = (user as { isVerified?: boolean }).isVerified
        token.role = (user as { role?: string }).role || "user"
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.isVerified = token.isVerified as boolean | undefined
        session.user.role = token.role as string | undefined
        try {
          const dbUser = await getUserWithId(token.id as string)
          if (dbUser) {
            session.user.image = (dbUser.avatarUrl as string) || null
            session.user.name = dbUser.name as string
          }
        } catch (e) {
          console.error("Failed to fetch user session data:", e)
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
