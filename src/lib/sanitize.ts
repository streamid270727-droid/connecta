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
  // Tokenize: split into tags and text
  const tokens = input.split(/(<[^>]+>)/g)
  const result: string[] = []

  for (const token of tokens) {
    if (token.startsWith("<")) {
      // It's a tag — check if it's safe
      const tagMatch = token.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/)
      if (tagMatch) {
        const tagName = tagMatch[1].toLowerCase()
        if (SAFE_TAGS.has(tagName)) {
          // For opening tags, validate attributes
          if (token.startsWith("</")) {
            // Closing tag — always safe
            result.push(token)
          } else {
            // Opening tag — validate attributes
            const attrMatch = token.match(/^<[^>]+>/)
            if (attrMatch) {
              const tagStr = attrMatch[0]
              // Extract attributes
              const attrs: string[] = []
              const attrRegex = /([a-zA-Z-]+)(?:=["']([^"']*)["'])?/g
              let m: RegExpExecArray | null
              // Skip the tag name itself
              const afterTag = tagStr.replace(/^<[a-zA-Z]+/, "")
              while ((m = attrRegex.exec(afterTag)) !== null) {
                const [, attrName, attrValue] = m
                const allowedAttrs = SAFE_ATTRS[tagName]
                if (allowedAttrs?.has(attrName.toLowerCase())) {
                  if (attrName.toLowerCase() === "href") {
                    // Validate URL
                    try {
                      const parsed = new URL(attrValue)
                      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
                        attrs.push(`${attrName}="${escapeHtml(attrValue)}" rel="noopener noreferrer" target="_blank"`)
                      }
                    } catch {
                      // Not a valid URL — skip this attribute
                    }
                  } else if (attrName.toLowerCase() !== "rel" && attrName.toLowerCase() !== "target") {
                    attrs.push(`${attrName}="${escapeHtml(attrValue)}"`)
                  }
                }
              }
              if (attrs.length > 0) {
                result.push(`<${tagName} ${attrs.join(" ")}>`)
              } else {
                result.push(`<${tagName}>`)
              }
            } else {
              result.push(`<${tagName}>`)
            }
          }
        }
        // Unknown tags are stripped (not added to result)
      }
    } else {
      // It's text — escape it
      result.push(escapeHtml(token))
    }
  }

  return result.join("")
}

/**
 * Strip all HTML tags from a string.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim()
}
