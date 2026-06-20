const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 300000 // 5 minutes

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number; retryAfter: number } {
  cleanup()
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxRequests - 1, retryAfter: 0 }
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { success: false, remaining: 0, retryAfter }
  }

  record.count++
  return { success: true, remaining: maxRequests - record.count, retryAfter: 0 }
}

/**
 * Helper to get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}
