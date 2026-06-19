"use client"

import { Suspense } from "react"
import { useSession } from "next-auth/react"
import { AuthScreen } from "@/components/auth/auth-screen"
import { AppShell } from "@/components/app-shell"

export default function Page() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <AuthScreen />
      </Suspense>
    )
  }

  return <AppShell />
}
