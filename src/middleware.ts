import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // API routes that require authentication
    if (pathname.startsWith("/api/")) {
      // Public API routes (no auth required)
      const publicApiRoutes = [
        "/api/auth/register",
        "/api/auth/signin",
        "/api/auth/csrf",
        "/api/auth/session",
        "/api/auth/providers",
        "/api/route",
      ]

      const isPublicApi = publicApiRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
      )

      // NextAuth catch-all handles /api/auth/*
      const isNextAuthApi = pathname.startsWith("/api/auth/")

      if (!isPublicApi && !isNextAuthApi) {
        if (!token) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // We handle auth check in middleware function above
    },
  }
)

export const config = {
  matcher: [
    // Protect all API routes except NextAuth and public ones
    "/api/:path*",
  ],
}
