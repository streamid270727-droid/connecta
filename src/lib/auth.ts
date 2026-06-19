import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcryptjs"
import { db } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
        const user = await db.user.findUnique({
          where: { email },
        })
        if (!user) {
          throw new Error("Email tidak terdaftar")
        }
        const isValid = await compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error("Kata sandi salah")
        }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          username: user.username,
          isVerified: user.isVerified,
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.isVerified = token.isVerified as boolean | undefined
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "connecta-dev-secret-key-change-in-production-2024",
}
