import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

// GET /api/trending — extract trending hashtags from recent posts (last 48h)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const posts = await db.post.findMany({
      where: { createdAt: { gte: since } },
      select: { content: true },
      take: 500,
    })

    // Extract hashtags
    const counts = new Map<string, number>()
    const hashtagRegex = /#([\p{L}\p{N}_]+)/gu
    for (const p of posts) {
      const matches = [...p.content.matchAll(hashtagRegex)]
      for (const m of matches) {
        const tag = m[1].toLowerCase()
        counts.set(tag, (counts.get(tag) || 0) + 1)
      }
    }

    // If no hashtags, derive trending from common words
    let trending: { tag: string; count: number }[] = []
    if (counts.size === 0) {
      const wordCounts = new Map<string, number>()
      const stopWords = new Set([
        "yang", "dan", "di", "ke", "dari", "untuk", "dengan", "atau", "ini",
        "itu", "saya", "kamu", "kita", "akan", "tidak", "ada", "juga", "lebih",
        "sudah", "bisa", "the", "a", "to", "and", "of", "in", "is", "for",
        "on", "with", "as", "by", "at", "an", "be", "this", "that", "have",
        "from", "or", "not", "but", "are", "they", "you", "we", "he", "she",
        "my", "your", "our", "their", "its", "his", "her",
      ])
      for (const p of posts) {
        const words = p.content
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/)
          .filter((w) => w.length > 4 && !stopWords.has(w))
        for (const w of words) {
          wordCounts.set(w, (wordCounts.get(w) || 0) + 1)
        }
      }
      trending = Array.from(wordCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    } else {
      trending = Array.from(counts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    }

    return NextResponse.json({ trending })
  } catch (error) {
    console.error("GET /api/trending error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
