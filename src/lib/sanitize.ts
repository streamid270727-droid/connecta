/**
 * Simple HTML sanitizer — escapes all HTML except safe tags.
 * For MVP purposes only. Consider DOMPurify for production.
 */

const SAFE_TAGS = new Set(["b", "i", "em", "strong", "a", "br", "p", "span"])
const SAFE_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel"]),
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * Sanitize user-generated content for safe rendering.
 * Allows: links (with safety checks), bold, italic, line breaks.
 * Strips everything else.
 */
export function sanitizeHtml(input: string): string {
  // First pass: escape everything
  let escaped = escapeHtml(input)

  // Allow <br> and \n as line breaks
  escaped = escaped.replace(/\n/g, "<br>")

  // Allow safe URLs in href
  escaped = escaped.replace(
    /href="([^"]*)"/g,
    (_, url) => {
      try {
        const parsed = new URL(url)
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          return `href="${escapeHtml(url)}" rel="noopener noreferrer" target="_blank"`
        }
      } catch {
        // Not a valid URL, strip it
      }
      return 'href="#"'
    }
  )

  return escaped
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim()
}
