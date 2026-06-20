import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { rateLimit } from "@/lib/rate-limit"

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests within limit", () => {
    const result = rateLimit("test-key", 3, 60000)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it("blocks requests over limit", () => {
    rateLimit("test-key-2", 2, 60000)
    rateLimit("test-key-2", 2, 60000)
    const result = rateLimit("test-key-2", 2, 60000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("resets after window expires", () => {
    rateLimit("test-key-3", 1, 60000)
    const result1 = rateLimit("test-key-3", 1, 60000)
    expect(result1.success).toBe(false)

    vi.advanceTimersByTime(61000)

    const result2 = rateLimit("test-key-3", 1, 60000)
    expect(result2.success).toBe(true)
  })

  it("tracks different keys independently", () => {
    rateLimit("key-a", 1, 60000)
    const result = rateLimit("key-b", 1, 60000)
    expect(result.success).toBe(true)
  })
})
