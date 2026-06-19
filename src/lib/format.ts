// Formatting utilities for Connecta

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 10) return "baru saja"
  if (diffSec < 60) return `${diffSec} detik lalu`
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay === 1) return "kemarin"
  if (diffDay < 7) return `${diffDay} hari lalu`
  if (diffWeek < 4) return `${diffWeek} minggu lalu`
  if (diffMonth < 12) return `${diffMonth} bulan lalu`
  return `${diffYear} tahun lalu`
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1000000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K"
  return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M"
}

export function getInitials(name?: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Avatar gradient colors based on user id (for fallback)
export function getAvatarGradient(seed?: string): string {
  const gradients = [
    "from-rose-400 to-pink-600",
    "from-amber-400 to-orange-600",
    "from-emerald-400 to-teal-600",
    "from-violet-400 to-purple-600",
    "from-cyan-400 to-sky-600",
    "from-fuchsia-400 to-pink-600",
    "from-lime-400 to-green-600",
    "from-indigo-400 to-violet-600",
  ]
  if (!seed) return gradients[0]
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

// Cover gradient colors
export function getCoverGradient(seed?: string): string {
  const gradients = [
    "from-rose-500/20 via-pink-500/10 to-purple-500/20",
    "from-amber-500/20 via-orange-500/10 to-red-500/20",
    "from-emerald-500/20 via-teal-500/10 to-cyan-500/20",
    "from-violet-500/20 via-purple-500/10 to-fuchsia-500/20",
    "from-sky-500/20 via-cyan-500/10 to-blue-500/20",
  ]
  if (!seed) return gradients[0]
  const hash = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return gradients[hash % gradients.length]
}

// Extract YouTube video ID from URL
export function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// Extract Vimeo video ID from URL
export function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return match ? match[1] : null
}

export function isImageUrl(url: string): boolean {
  return /\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i.test(url)
}

// Parse images JSON from post
export function parseImages(images?: string | null): string[] {
  if (!images) return []
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
