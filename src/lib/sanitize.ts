import DOMPurify from "isomorphic-dompurify"

/**
 * Sanitize user-generated HTML content for safe rendering.
 * Uses DOMPurify for production-grade XSS protection.
 */
export function sanitizeHtml(input: string): string {
  // Use ADD_ATTR to allow target on links, then post-process
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "br", "p", "span"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  })

  // Add target="_blank" and rel="noopener noreferrer" to all links
  return sanitized.replace(
    /<a\s+href="([^"]*)">/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">'
  )
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }).trim()
}
