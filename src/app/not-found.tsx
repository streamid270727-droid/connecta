import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-2xl">
        <FileQuestion className="text-muted-foreground/60 size-8" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Halaman Tidak Ditemukan</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="size-4" />
          ke Beranda
        </Link>
      </Button>
    </div>
  )
}
