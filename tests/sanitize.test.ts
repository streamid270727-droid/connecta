import { describe, it, expect } from "vitest"
import { sanitizeHtml, stripHtml } from "@/lib/sanitize"

describe("sanitizeHtml", () => {
  it("escapes dangerous HTML tags", () => {
    expect(sanitizeHtml("<script>alert('xss')</script>")).not.toContain("<script>")
  })

  it("preserves plain text entities (sanitizer focuses on XSS, not encoding)", () => {
    // DOMPurify preserves & as-is in plain text (not a security risk)
    expect(sanitizeHtml("Hello & world")).toBe("Hello & world")
    expect(sanitizeHtml("5 > 3")).toBe("5 > 3")
    // DOMPurify escapes < in text context
    expect(sanitizeHtml("a < b")).toBe("a &lt; b")
    // But actual tags are stripped (including trailing content of script tag)
    expect(sanitizeHtml("a <script>alert(1)</script> tag")).toBe("a  tag")
  })

  it("allows safe tags like b, i, em, strong", () => {
    expect(sanitizeHtml("<b>bold</b>")).toBe("<b>bold</b>")
    expect(sanitizeHtml("<i>italic</i>")).toBe("<i>italic</i>")
  })

  it("allows br tags", () => {
    expect(sanitizeHtml("line1<br>line2")).toBe("line1<br>line2")
  })

  it("allows links with http/https", () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>')
    expect(result).toContain("href=")
    expect(result).toContain("https://example.com")
    expect(result).toContain("target=")
    expect(result).toContain("noopener")
  })

  it("strips javascript: URLs", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">link</a>')
    expect(result).not.toContain("javascript:")
  })

  it("strips dangerous tags but keeps content", () => {
    expect(sanitizeHtml("<img src=x onerror=alert(1)>test")).toBe("test")
  })

  it("handles nested safe tags", () => {
    expect(sanitizeHtml("<b><i>text</i></b>")).toBe("<b><i>text</i></b>")
  })

  it("handles plain text", () => {
    expect(sanitizeHtml("Hello World")).toBe("Hello World")
  })
})

describe("stripHtml", () => {
  it("removes all HTML tags", () => {
    expect(stripHtml("<b>bold</b> <i>italic</i>")).toBe("bold italic")
  })

  it("handles plain text", () => {
    expect(stripHtml("Hello World")).toBe("Hello World")
  })

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("")
  })
})
