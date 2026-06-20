"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-destructive">Terjadi Kesalahan</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          {error.message || "Sepertinya ada yang tidak beres. Silakan coba lagi."}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Coba Lagi
      </button>
    </div>
  )
}
