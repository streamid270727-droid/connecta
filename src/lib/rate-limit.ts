const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxRequests - 1 }
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0 }
  }

  record.count++
  return { success: true, remaining: maxRequests - record.count }
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 300000)
