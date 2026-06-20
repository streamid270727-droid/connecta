import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  formatRelativeTime,
  formatShortDate,
  formatTime,
  formatNumber,
  getInitials,
  getAvatarGradient,
  getYouTubeId,
  getVimeoId,
  parseImages,
} from "@/lib/format"

describe("formatNumber", () => {
  it("returns exact number under 1000", () => {
    expect(formatNumber(0)).toBe("0")
    expect(formatNumber(1)).toBe("1")
    expect(formatNumber(999)).toBe("999")
  })

  it("formats thousands with K", () => {
    expect(formatNumber(1000)).toBe("1K")
    expect(formatNumber(1500)).toBe("1.5K")
    expect(formatNumber(999999)).toBe("1000.0K")
  })

  it("formats millions with M", () => {
    expect(formatNumber(1000000)).toBe("1M")
    expect(formatNumber(2500000)).toBe("2.5M")
  })
})

describe("getInitials", () => {
  it("returns ? for null/undefined", () => {
    expect(getInitials(null)).toBe("?")
    expect(getInitials(undefined)).toBe("?")
    expect(getInitials("")).toBe("?")
  })

  it("returns first 2 chars for single word", () => {
    expect(getInitials("Budi")).toBe("BU")
  })

  it("returns first letter of first and last name", () => {
    expect(getInitials("Budi Santoso")).toBe("BS")
    expect(getInitials("Budi Dwi Santoso")).toBe("BS")
  })
})

describe("getAvatarGradient", () => {
  it("returns first gradient for no seed", () => {
    expect(getAvatarGradient()).toContain("rose")
  })

  it("returns consistent gradient for same seed", () => {
    const g1 = getAvatarGradient("user123")
    const g2 = getAvatarGradient("user123")
    expect(g1).toBe(g2)
  })
})

describe("getYouTubeId", () => {
  it("extracts ID from youtube.com/watch", () => {
    expect(getYouTubeId("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts ID from youtu.be", () => {
    expect(getYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("extracts ID from embed URL", () => {
    expect(getYouTubeId("https://youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
  })

  it("returns null for invalid URL", () => {
    expect(getYouTubeId("https://example.com")).toBeNull()
  })
})

describe("getVimeoId", () => {
  it("extracts ID from vimeo.com", () => {
    expect(getVimeoId("https://vimeo.com/123456789")).toBe("123456789")
  })

  it("extracts ID from vimeo.com/video/", () => {
    expect(getVimeoId("https://vimeo.com/video/123456789")).toBe("123456789")
  })

  it("returns null for invalid URL", () => {
    expect(getVimeoId("https://example.com")).toBeNull()
  })
})

describe("parseImages", () => {
  it("returns empty array for null/undefined", () => {
    expect(parseImages(null)).toEqual([])
    expect(parseImages(undefined)).toEqual([])
  })

  it("parses valid JSON array", () => {
    expect(parseImages('["img1.jpg","img2.jpg"]')).toEqual(["img1.jpg", "img2.jpg"])
  })

  it("returns empty array for invalid JSON", () => {
    expect(parseImages("not json")).toEqual([])
  })

  it("returns empty array for non-array JSON", () => {
    expect(parseImages('{"key":"value"}')).toEqual([])
  })
})

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2025-01-15T12:00:00"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 'baru saja' for recent times", () => {
    expect(formatRelativeTime(new Date("2025-01-15T11:59:55"))).toBe("baru saja")
  })

  it("returns seconds ago", () => {
    expect(formatRelativeTime(new Date("2025-01-15T11:59:30"))).toBe("30 detik lalu")
  })

  it("returns minutes ago", () => {
    expect(formatRelativeTime(new Date("2025-01-15T11:55:00"))).toBe("5 menit lalu")
  })

  it("returns hours ago", () => {
    expect(formatRelativeTime(new Date("2025-01-15T09:00:00"))).toBe("3 jam lalu")
  })

  it("returns 'kemarin' for 1 day", () => {
    expect(formatRelativeTime(new Date("2025-01-14T12:00:00"))).toBe("kemarin")
  })

  it("returns days ago", () => {
    expect(formatRelativeTime(new Date("2025-01-12T12:00:00"))).toBe("3 hari lalu")
  })

  it("returns weeks ago", () => {
    expect(formatRelativeTime(new Date("2025-01-01T12:00:00"))).toBe("2 minggu lalu")
  })
})
