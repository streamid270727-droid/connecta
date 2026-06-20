"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-2xl">
        <AlertTriangle className="text-destructive size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Terjadi Kesalahan</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {error.message || "Sepertinya ada yang tidak beres. Silakan coba lagi."}
        </p>
        {error.digest && (
          <p className="text-muted-foreground/60 font-mono text-xs">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline">
          <RefreshCw className="size-4" />
          Coba Lagi
        </Button>
        <Button onClick={() => (window.location.href = "/")}>
          <Home className="size-4" />
          ke Beranda
        </Button>
      </div>
    </div>
  )
}
