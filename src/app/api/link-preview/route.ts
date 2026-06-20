import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { z } from "zod"

const linkPreviewSchema = z.object({
  url: z.string().url("URL tidak valid"),
})

interface LinkPreviewData {
  title: string
  description: string
  image: string | null
  url: string
  siteName: string | null
}

function extractMetaContent(html: string, property: string): string | null {
  // Try property attribute first, then name
  const patterns = [
    new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"[^>]*/?>`, "i"),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${property}"[^>]*/?>`, "i"),
    new RegExp(`<meta[^>]*name="${property}"[^>]*content="([^"]*)"[^>]*/?>`, "i"),
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*name="${property}"[^>]*/?>`, "i"),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractTitle(html: string): string | null {
  // Try og:title first
  const ogTitle = extractMetaContent(html, "og:title")
  if (ogTitle) return ogTitle

  // Fallback to <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleMatch?.[1]?.trim() || null
}

function extractDescription(html: string): string | null {
  return (
    extractMetaContent(html, "og:description") ||
    extractMetaContent(html, "description")
  )
}

function extractImage(html: string, baseUrl: string): string | null {
  const image =
    extractMetaContent(html, "og:image") ||
    extractMetaContent(html, "twitter:image")

  if (!image) return null

  // Resolve relative URLs
  try {
    return new URL(image, baseUrl).href
  } catch {
    return image
  }
}

function extractSiteName(html: string): string | null {
  return extractMetaContent(html, "og:site_name")
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Rate limit: 10 requests per minute per user
    const { success } = rateLimit(`link-preview:${session.user.id}`, 10, 60000)
    if (!success) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = linkPreviewSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { url } = parsed.data

    // Fetch the page with a timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "ConnectaBot/1.0 (Social Media Link Preview)",
          Accept: "text/html",
        },
        signal: controller.signal,
        redirect: "follow",
      })
      clearTimeout(timeout)

      if (!res.ok) {
        return NextResponse.json(
          { error: "Tidak dapat mengambil URL" },
          { status: 422 }
        )
      }

      // Only read first 50KB to avoid memory issues
      const reader = res.body?.getReader()
      if (!reader) {
        return NextResponse.json({ error: "Tidak dapat membaca respons" }, { status: 422 })
      }

      const chunks: Uint8Array[] = []
      let totalSize = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
        totalSize += value.length
        if (totalSize > 50000) break // 50KB limit
      }
      reader.cancel()
      html = new TextDecoder().decode(Buffer.concat(chunks))
    } catch {
      clearTimeout(timeout)
      return NextResponse.json(
        { error: "Gagal mengambil URL" },
        { status: 422 }
      )
    }

    const preview: LinkPreviewData = {
      title: extractTitle(html) || url,
      description: extractDescription(html) || "",
      image: extractImage(html, url),
      url,
      siteName: extractSiteName(html),
    }

    return NextResponse.json({ preview })
  } catch (error) {
    console.error("POST /api/link-preview error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
